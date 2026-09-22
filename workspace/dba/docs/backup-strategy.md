# Harmony Physio — Database Backup Strategy

## Regulatory Requirements Summary

| Regulation | Backup Requirement |
|------------|-------------------|
| NHS DTAC DSP Toolkit (Standard 1) | Minimum 35-day point-in-time recovery (PITR) for clinical systems |
| NHS Records Management Code 2021 | Clinical records retained 8–25 years; backups must cover the full retention window |
| UK GDPR Article 32 | Appropriate technical measures for data resilience and restoration |
| ISO 27001 (target certification) | Defined RTO/RPO, tested restoration procedures |

---

## 1. RDS Automated Backups

### Configuration
```
BackupRetentionPeriod: 35          # days — meets NHS DTAC minimum
PreferredBackupWindow: 02:00-03:00 # UTC (low traffic, outside UK business hours)
PreferredMaintenanceWindow: sun:03:00-sun:04:00  # UTC Sunday early morning
DeleteAutomatedBackups: false       # Retain backups after instance deletion
```

RDS automated backups provide **continuous transaction log uploads to S3**, enabling point-in-time recovery (PITR) to any second within the retention window.

### Recovery Point Objective (RPO)
- **5 minutes** — RDS transaction logs are uploaded to S3 approximately every 5 minutes.

### Recovery Time Objective (RTO)
- **< 1 hour** for full instance restore from PITR.
- **< 4 hours** for cross-region restore (DR scenario).

---

## 2. Manual Snapshots (Logical Backups)

In addition to automated backups, weekly manual RDS snapshots are taken:

```bash
aws rds create-db-snapshot \
  --db-instance-identifier harmony-physio-prod \
  --db-snapshot-identifier harmony-physio-prod-weekly-$(date +%Y%m%d) \
  --region eu-west-2
```

Manual snapshots are not subject to the 35-day automated backup limit. They are retained according to the data retention schedule below.

### Snapshot Schedule
| Snapshot Type | Frequency | Retention |
|---------------|-----------|-----------|
| Automated PITR | Continuous | 35 days |
| Weekly manual snapshot | Every Sunday 01:00 UTC | 1 year |
| Monthly manual snapshot | 1st of each month | 8 years |
| Annual manual snapshot | 1 January | 25 years (paediatric data safeguard) |

---

## 3. Cross-Region Backup for Disaster Recovery

### Primary region: eu-west-2 (London)
### DR region: eu-west-1 (Ireland)

Automated backups are replicated to eu-west-1 using RDS cross-region automated backup replication:

```
SourceRegion: eu-west-2
DestinationRegion: eu-west-1
BackupRetentionPeriod: 35
```

Weekly manual snapshots are additionally copied to eu-west-1 after creation:

```bash
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier arn:aws:rds:eu-west-2:<account-id>:snapshot:harmony-physio-prod-weekly-$(date +%Y%m%d) \
  --target-db-snapshot-identifier harmony-physio-prod-weekly-$(date +%Y%m%d)-dr \
  --source-region eu-west-2 \
  --region eu-west-1 \
  --kms-key-id arn:aws:kms:eu-west-1:<account-id>:key/<dr-key-id>
```

Both regions use separate AWS KMS keys managed under the same AWS Organisation with cross-account access policies.

---

## 4. pg_dump Logical Backups

For portable, schema-selective restoration (e.g. restoring a single table without full instance recovery), a nightly pg_dump export runs via an ECS scheduled task:

```bash
pg_dump \
  --host $DB_HOST \
  --username $DB_USER \
  --dbname harmony_physio \
  --format=custom \
  --compress=9 \
  --file /tmp/harmony_physio_$(date +%Y%m%d_%H%M%S).dump

# Upload to S3
aws s3 cp /tmp/harmony_physio_*.dump \
  s3://harmony-physio-db-backups/logical/$(date +%Y/%m/%d)/ \
  --sse aws:kms \
  --sse-kms-key-id arn:aws:kms:eu-west-2:<account-id>:key/<backup-key-id>
```

The S3 bucket (`harmony-physio-db-backups`) has:
- **Versioning enabled**
- **Object Lock (Compliance mode)** on the `logical/` prefix — prevents deletion within retention window, satisfying NHS immutability requirements for records
- **Lifecycle rules** to transition to S3 Glacier after 90 days (cost optimisation)

---

## 5. Backup Testing Schedule

Untested backups are not backups. The following restoration tests are mandatory:

| Test Type | Frequency | Procedure | Owner |
|-----------|-----------|-----------|-------|
| PITR restore to staging | Monthly | Restore prod PITR to a separate `harmony-physio-staging-restore` RDS instance; run smoke tests against restored DB | DBA + DevOps |
| Manual snapshot restore | Quarterly | Restore latest weekly snapshot to isolated VPC; validate row counts and referential integrity | DBA |
| Cross-region DR drill | Semi-annually | Promote eu-west-1 replica; run full application test suite against it | DevOps + Engineering Lead |
| pg_dump restore test | Monthly | Restore logical dump to `harmony-physio-test` instance; verify table checksums | DBA |
| Full DR simulation | Annually | Simulate eu-west-2 region failure; invoke DR runbook; measure actual RTO | Tech Lead + DevOps |

Results of each test are recorded in Confluence under `Infrastructure > DR Test Log` and reviewed at the quarterly security review.

---

## 6. Data Retention Policy by Data Type

All retention periods comply with the **NHS Records Management Code of Practice 2021**.

| Data Type | Table(s) | Minimum Retention | Maximum Retention | Deletion Method |
|-----------|----------|-------------------|-------------------|-----------------|
| Adult patient records | patients, electronic_health_records | 8 years from last contact | 10 years | Hard delete after legal hold check |
| Paediatric patient records | patients, electronic_health_records | Until patient's 25th birthday | Until patient's 26th birthday | Hard delete after legal hold check |
| Appointment records | appointments | 8 years | 10 years | Hard delete |
| Clinical video recordings | video_sessions (recordingUrl) | 8 years if clinical use; otherwise 30 days | 10 years | S3 object expiry + null recordingUrl |
| Audit logs | audit_logs | 10 years | 12 years | Hard delete (after 10 years records cease to be subject to NHS Code) |
| Payment / financial records | payments | 7 years (HMRC) | 8 years | Hard delete |
| User authentication records | users | Active + 8 years dormant | 10 years | Anonymise PII, soft delete row retained for FK integrity |
| GDPR consent records | users (consentGivenAt, consentVersion) | Duration of processing + 3 years | 6 years | Anonymise alongside user PII scrub |

### Deletion Workflow
1. Nightly job identifies rows that have exceeded retention window.
2. Job checks for active legal holds (flag table `legal_holds` — Phase 2 feature).
3. For `users`/`patients`: PII fields are overwritten with anonymised values; row is retained.
4. For `electronic_health_records` and `appointments`: Hard-deleted after confirming no active legal hold and no open insurance/litigation flag.
5. Deletion events are recorded in `audit_logs` with `action = 'RECORD_RETENTION_DELETED'`.
6. A monthly retention report is generated for the Data Protection Officer (DPO).

---

## 7. Encryption of Backups

| Backup Type | Encryption |
|-------------|-----------|
| RDS automated backups | KMS-encrypted (same key as RDS instance) |
| Manual RDS snapshots | KMS-encrypted; DR copies use separate regional key |
| pg_dump on S3 | SSE-KMS with dedicated backup key |
| S3 bucket policy | `deny` any `s3:PutObject` without `--sse aws:kms` |

KMS key rotation is enabled (annual automatic rotation). Key aliases:
- `alias/harmony-physio-rds-prod` — RDS instance and automated backup key (eu-west-2)
- `alias/harmony-physio-rds-dr` — DR snapshot key (eu-west-1)
- `alias/harmony-physio-s3-backup` — S3 logical backup key (eu-west-2)

---

## 8. Monitoring and Alerting

| Metric | Threshold | Alert |
|--------|-----------|-------|
| `FreeStorageSpace` | < 20 GB | PagerDuty P2 |
| `BackupRetentionPeriod` drift | != 35 | CloudWatch alarm → Slack #ops |
| Failed backup window | Any | PagerDuty P1 |
| Replication lag (cross-region) | > 1 hour | Slack #ops |
| KMS key scheduled deletion | Any | PagerDuty P1 |

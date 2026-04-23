# Test Credentials (Local Dev Only)

Use these only for local testing.
Do not use in production.

## Admin

- email: admin.test@movesmart.dev
  password: Test@1234

## Shipper

- email: shipper.test1@movesmart.dev
  password: Test@1234

- email: shipper.test2@movesmart.dev
  password: Test@1234

## Carrier

- email: carrier.test1@movesmart.dev
  password: Test@1234

- email: carrier.test2@movesmart.dev
  password: Test@1234

- email: carrier.test3@movesmart.dev
  password: Test@1234

## Notes

- All accounts below are seeded in the local database and use the same password.
- `carrier.test1@movesmart.dev` was used in instant-booking verification.
- Recommended roles/status:
  - carriers: role=`carrier`, verificationStatus=`approved`
  - shippers: role=`shipper`, verificationStatus=`approved`
  - admin: role=`admin`, verificationStatus=`approved`

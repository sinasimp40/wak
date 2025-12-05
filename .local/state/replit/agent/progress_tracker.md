[x] 1. Install the required packages
[x] 2. Restart the workflow to see if the project is working
[x] 3. Verify the project is working using the feedback tool
[x] 4. Inform user the import is completed and they can start building, mark the import as completed using the complete_project_import tool
[x] 5. Fixed database driver - switched from @neondatabase/serverless to node-postgres for Replit compatibility
[x] 6. Created PostgreSQL database and pushed schema
[x] 7. Created admin and user accounts with zero balance (real balance)
[x] 8. Fixed NOWPayments black screen issue - payment now opens in new tab instead of iframe
[x] 9. Implemented atomic balance deduction and order creation in single database transaction
[x] 10. Added HMAC-SHA512 webhook signature verification for NOWPayments payment confirmations
[x] 11. Added Check Payment Status feature in admin panel to sync pending payments from NOWPayments
[x] 12. Created new admin and user accounts (admin@vps.com / admin123, user@vps.com / user123)
[x] 13. Payment timer displays hours:minutes:seconds format for payment windows (uses actual NOWPayments expiration)
[x] 14. Added billing/transactions tab showing complete payment history for users
[x] 15. Admin can change user passwords with secure bcrypt hashing
[x] 16. Removed registration IP column from admin users table (login history still available via separate dialog)
[x] 17. Added VPS credentials (rdpUsername, rdpPassword) to schema with AES-256-GCM encryption at rest
[x] 18. VPS credentials viewable and editable in VPS list page
[x] 19. VPS credentials viewable and editable in orders page
[x] 20. Created new admin and user accounts (admin@rdppanel.com / admin123, user@rdppanel.com / user123)
[x] 21. Added VPS credentials view/edit to admin VPS live list (IP, username, password with change option)
[x] 22. Added real-time OneDash balance with auto-refresh every 30 seconds and dedicated refresh button
[x] 23. Created new accounts: admin@panel.com / admin123 (with $2.00 balance), user@panel.com / user123 (with $0 balance)
[x] 24. Re-provisioned database and created fresh accounts: admin@rdppanel.com / admin123 ($2.00 balance), user@rdppanel.com / user123 ($0 balance)
[x] 25. Added "Fetch from OneDash" button to sync VPS credentials directly from OneDash API
[x] 26. Added warning that password changes in panel are LOCAL ONLY (OneDash API has no password change endpoint)
[x] 27. Fixed credentials dialog to show prompt when no password is stored and fetch from OneDash is available
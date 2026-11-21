CREATE TABLE households (id TEXT PRIMARY KEY, name TEXT NOT NULL, policies TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE users (id TEXT PRIMARY KEY, household_id TEXT NOT NULL REFERENCES households(id), username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('parent','child')), preferences TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, device TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE files (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), path TEXT NOT NULL, name TEXT NOT NULL, kind TEXT NOT NULL, mime TEXT NOT NULL DEFAULT 'application/octet-stream', size INTEGER NOT NULL DEFAULT 0, content TEXT, object_key TEXT, trashed INTEGER NOT NULL DEFAULT 0, modified_at INTEGER NOT NULL, UNIQUE(owner_id,path));
--> statement-breakpoint
CREATE TABLE shares (id TEXT PRIMARY KEY, file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE, owner_id TEXT NOT NULL REFERENCES users(id), token_hash TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE audit (id TEXT PRIMARY KEY, household_id TEXT NOT NULL REFERENCES households(id), user_id TEXT, event TEXT NOT NULL, detail TEXT NOT NULL, created_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE approvals (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), purpose TEXT NOT NULL, expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX files_owner ON files(owner_id,trashed);
--> statement-breakpoint
CREATE INDEX audit_family ON audit(household_id,created_at);
--> statement-breakpoint
CREATE INDEX sessions_expiry ON sessions(expires_at);

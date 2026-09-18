import Database from "better-sqlite3";

/**
 * Inicializa el esquema completo de tablas en SQLite local
 */
export function initializeLocalDatabase(sqlite: Database.Database): void {
  if (!sqlite) return;

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      tax_id TEXT,
      email TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      currency TEXT DEFAULT 'ARS' NOT NULL,
      is_active INTEGER DEFAULT 1 NOT NULL,
      settings TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      phone TEXT,
      is_active INTEGER DEFAULT 1 NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      dni TEXT NOT NULL,
      dni_blind_index TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      birth_date TEXT,
      photo_url TEXT,
      status TEXT DEFAULT 'ACTIVE' NOT NULL,
      role TEXT DEFAULT 'SOCIO' NOT NULL,
      onboarding_state TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      permission_id TEXT NOT NULL REFERENCES permissions(id)
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      active_token_id TEXT NOT NULL,
      rotation_counter INTEGER DEFAULT 1 NOT NULL,
      is_revoked INTEGER DEFAULT 0 NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medical_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      medical_clearance_status TEXT DEFAULT 'PENDING_REVIEW' NOT NULL,
      clearance_expiry_date TEXT,
      clearance_document_url TEXT,
      doctor_name TEXT,
      doctor_license_number TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      blood_type TEXT DEFAULT 'UNKNOWN',
      encrypted_conditions TEXT,
      encrypted_medications TEXT,
      encrypted_allergies TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS membership_plans (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      duration_days INTEGER NOT NULL,
      max_visits_per_week INTEGER,
      allowed_branches TEXT,
      is_active INTEGER DEFAULT 1 NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      plan_id TEXT NOT NULL REFERENCES membership_plans(id),
      status TEXT DEFAULT 'PENDING_PAYMENT' NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      auto_renew INTEGER DEFAULT 0 NOT NULL,
      cancellation_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      subscription_id TEXT REFERENCES subscriptions(id),
      invoice_number TEXT NOT NULL,
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0 NOT NULL,
      status TEXT DEFAULT 'PENDING' NOT NULL,
      due_date TEXT NOT NULL,
      issued_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cash_shifts (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      branch_id TEXT NOT NULL REFERENCES branches(id),
      opened_by_user_id TEXT NOT NULL REFERENCES users(id),
      closed_by_user_id TEXT REFERENCES users(id),
      initial_cash REAL NOT NULL,
      system_expected_cash REAL,
      declared_cash REAL,
      difference_cash REAL,
      status TEXT DEFAULT 'OPEN' NOT NULL,
      opened_at TEXT NOT NULL,
      closed_at TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS payment_transactions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      invoice_id TEXT NOT NULL REFERENCES invoices(id),
      cash_shift_id TEXT REFERENCES cash_shifts(id),
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      gateway_reference TEXT,
      status TEXT DEFAULT 'APPROVED' NOT NULL,
      processed_by_user_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cash_movements (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      cash_shift_id TEXT NOT NULL REFERENCES cash_shifts(id),
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      receipt_url TEXT,
      registered_by_user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendances (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      branch_id TEXT NOT NULL REFERENCES branches(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      access_method TEXT DEFAULT 'DNI_KEYPAD' NOT NULL,
      access_status TEXT NOT NULL,
      warning_reason TEXT,
      denial_reason TEXT,
      check_in_at TEXT NOT NULL,
      registered_by_user_id TEXT REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      tenant_id TEXT REFERENCES tenants(id),
      name TEXT NOT NULL,
      muscle_group TEXT NOT NULL,
      secondary_muscles TEXT,
      equipment TEXT NOT NULL,
      media_url TEXT,
      instructions TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      user_id TEXT REFERENCES users(id),
      coach_id TEXT REFERENCES users(id),
      name TEXT NOT NULL,
      goal TEXT NOT NULL,
      is_template INTEGER DEFAULT 0 NOT NULL,
      valid_from TEXT,
      valid_until TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS routine_days (
      id TEXT PRIMARY KEY,
      routine_id TEXT NOT NULL REFERENCES routines(id),
      day_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS routine_exercises (
      id TEXT PRIMARY KEY,
      routine_day_id TEXT NOT NULL REFERENCES routine_days(id),
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      order_index INTEGER NOT NULL,
      target_sets INTEGER NOT NULL,
      target_reps TEXT NOT NULL,
      target_rpe REAL,
      rest_seconds INTEGER DEFAULT 90 NOT NULL,
      superset_group_id TEXT,
      coach_notes TEXT
    );

    CREATE TABLE IF NOT EXISTS workout_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      routine_day_id TEXT REFERENCES routine_days(id),
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_minutes INTEGER,
      total_volume_kg REAL,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS set_logs (
      id TEXT PRIMARY KEY,
      workout_log_id TEXT NOT NULL REFERENCES workout_logs(id),
      exercise_id TEXT NOT NULL REFERENCES exercises(id),
      set_number INTEGER NOT NULL,
      weight_kg REAL NOT NULL,
      reps_done INTEGER NOT NULL,
      estimated_one_rep_max REAL,
      rpe_done REAL,
      is_personal_record INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS body_measurements (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      measured_at TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      height_cm REAL,
      body_fat_percentage REAL,
      muscle_percentage REAL,
      chest_cm REAL,
      waist_cm REAL,
      hips_cm REAL,
      arm_right_cm REAL,
      arm_left_cm REAL,
      thigh_right_cm REAL,
      thigh_left_cm REAL,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      tenant_id TEXT REFERENCES tenants(id),
      gateway TEXT NOT NULL,
      external_event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING' NOT NULL,
      payload TEXT NOT NULL,
      error_message TEXT,
      received_at TEXT NOT NULL,
      processed_at TEXT
    );
  `);
}

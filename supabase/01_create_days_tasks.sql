-- Step 1: Create days table
CREATE TABLE IF NOT EXISTS days (
  id          bigserial PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  week_key    text NOT NULL,
  day_index   int  NOT NULL,
  name        text,
  date        text,
  type        text,
  notes       text,
  enabled     boolean DEFAULT true,
  energy      text,
  rating      text,
  sleep_hours text,
  phone_hours text,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, week_key, day_index)
);

-- Step 2: Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id                     bigserial PRIMARY KEY,
  user_id                uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  day_id                 bigint REFERENCES days(id) ON DELETE CASCADE,
  task_order             int  NOT NULL,
  time                   text,
  task                   text,
  cat                    text,
  done                   boolean DEFAULT false,
  recurring              boolean DEFAULT false,
  linked_weekly_goal_id  text,
  linked_monthly_goal_id text,
  linked_goal_type       text,
  linked_goal_id         text,
  updated_at             timestamptz DEFAULT now()
);

-- Step 3: Enable RLS
ALTER TABLE days  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies — users can only access their own rows
CREATE POLICY "days: own rows only"
  ON days FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks: own rows only"
  ON tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 5: Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_days_user_week  ON days  (user_id, week_key);
CREATE INDEX IF NOT EXISTS idx_tasks_day_id    ON tasks (day_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id   ON tasks (user_id);

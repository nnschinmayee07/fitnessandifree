export interface WaterLogRow {
  id: string;
  user_id: string;
  amount_ml: number;
  date: string;                       // YYYY-MM-DD
  logged_at: string;                  // ISO-8601 timestamptz
}

export interface WaterLogInsert {
  user_id: string;
  amount_ml: number;
  date: string;
}

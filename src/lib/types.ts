export type Profile = {
  id: string;
  full_name: string;
  student_no: string | null;
  email: string | null;
};

export type Organization = {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
};

export type OrgRole = "owner" | "officer";

export type DaloEvent = {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  venue: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  registration_open: boolean;
  is_published: boolean;
  require_checkout: boolean;
  min_attendance_minutes: number;
  certificate_signatory: string | null;
  certificate_signatory_title: string | null;
  created_at: string;
};

export type EventWithOrg = DaloEvent & { organizations: { id: string; name: string } | null };

export type Registration = {
  id: string;
  event_id: string;
  user_id: string;
  ticket_code: string;
  certificate_code: string;
  status: "registered" | "cancelled";
  checked_in_at: string | null;
  checked_out_at: string | null;
  created_at: string;
};

export type AttendanceRow = {
  registration_id: string;
  event_id: string;
  user_id: string;
  full_name: string;
  student_no: string | null;
  email: string | null;
  status: "registered" | "cancelled";
  ticket_code: string;
  certificate_code: string;
  registered_at: string;
  checked_in_at: string | null;
  checked_out_at: string | null;
  minutes_attended: number | null;
  completed: boolean;
};

export type ScanResult = {
  ok: boolean;
  result:
    | "checked_in"
    | "checked_out"
    | "invalid"
    | "wrong_event"
    | "cancelled"
    | "already_in"
    | "already_out"
    | "not_in"
    | "too_soon";
  message: string;
  name?: string;
  student_no?: string | null;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
};

export type CertificateData = {
  fullName: string;
  eventTitle: string;
  orgName: string;
  startsAt: string;
  endsAt: string;
  venue: string | null;
  signatory: string | null;
  signatoryTitle: string | null;
  certificateCode: string;
};

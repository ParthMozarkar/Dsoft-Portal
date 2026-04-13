export type UserRole = 'admin' | 'teacher' | 'student';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Batch {
  id: string;
  name: string;
  subject: string;
  teacher_id: string | null;
  enrollment_code: string;
  created_at: string;
}

export interface BatchEnrollment {
  id: string;
  batch_id: string;
  student_id: string;
  enrolled_at: string;
}

export interface Note {
  id: string;
  batch_id: string;
  uploaded_by: string;
  title: string;
  subject: string | null;
  file_url: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  batch_id: string;
  created_by: string;
  title: string;
  description: string | null;
  due_date: string;
  starter_file_url: string | null;
  created_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_url: string;
  student_note: string | null;
  status: 'pending' | 'reviewed' | 'resubmit';
  marks: number | null;
  remarks: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface Notice {
  id: string;
  batch_id: string;
  created_by: string;
  title: string;
  body: string;
  urgency: 'info' | 'important' | 'urgent';
  pinned: boolean;
  attachment_url: string | null;
  created_at: string;
}

export interface NoticeRead {
  id: string;
  notice_id: string;
  user_id: string;
  read_at: string;
}

export interface Lecture {
  id: string;
  batch_id: string;
  created_by: string;
  title: string;
  scheduled_at: string;
  daily_room_url: string | null;
  daily_room_name: string | null;
  recording_url: string | null;
  status: 'scheduled' | 'live' | 'ended';
  duration_seconds: number | null;
  created_at: string;
}

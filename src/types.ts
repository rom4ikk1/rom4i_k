export type Role = 'admin' | 'client' | 'installer' | 'designer';

export interface User {
  login: string;
  role: Role;
}

export interface Stage {
  id: number;
  project_id: number;
  name: string;
  date: string;
  status: 'ok' | 'process' | 'wait';
}

export interface Media {
  id: number;
  project_id: number;
  url: string;
}

export interface Message {
  id: number;
  project_id: number;
  sender_login: string;
  text: string;
  created_at?: string;
}

export interface Project {
  id: number;
  name: string;
  client_login: string;
  installer_login: string;
  designer_login?: string;
  status: string;
  deadline?: string;
  stages?: Stage[];
  media?: Media[];
  messages?: Message[];
  message_count: number;
}

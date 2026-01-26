export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string
                    full_name: string | null
                    role: 'user' | 'admin'
                    department: string | null
                }
                Insert: {
                    id: string
                    full_name?: string | null
                    role?: 'user' | 'admin'
                    department?: string | null
                }
                Update: {
                    id?: string
                    full_name?: string | null
                    role?: 'user' | 'admin'
                    department?: string | null
                }
            }
            rooms: {
                Row: {
                    id: number
                    name: string
                    capacity: number
                    facilities: string[] | null
                    is_vip: boolean
                    status: 'active' | 'maintenance'
                    created_at: string
                }
                Insert: {
                    id?: number
                    name: string
                    capacity: number
                    facilities?: string[] | null
                    is_vip?: boolean
                    status?: 'active' | 'maintenance'
                    created_at?: string
                }
                Update: {
                    id?: number
                    name?: string
                    capacity?: number
                    facilities?: string[] | null
                    is_vip?: boolean
                    status?: 'active' | 'maintenance'
                    created_at?: string
                }
            }
            bookings: {
                Row: {
                    created_at: string
                    end_time: string
                    id: string
                    room_id: number
                    start_time: string
                    status: string
                    check_in_status: string
                    title: string | null
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    end_time: string
                    id?: string
                    room_id: number
                    start_time: string
                    status?: string
                    check_in_status?: string
                    title?: string | null
                    user_id?: string
                }
                Update: {
                    created_at?: string
                    end_time?: string
                    id?: string
                    room_id?: number
                    start_time?: string
                    status?: string
                    check_in_status?: string
                    title?: string | null
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "bookings_room_id_fkey"
                        columns: ["room_id"]
                        isOneToOne: false
                        referencedRelation: "rooms"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "bookings_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    }
                ]
            }
            issues: {
                Row: {
                    id: string
                    user_id: string
                    room_id: number | null
                    title: string
                    description: string | null
                    severity: string | null
                    status: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    room_id?: number | null
                    title: string
                    description?: string | null
                    severity?: string | null
                    status?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    room_id?: number | null
                    title?: string
                    description?: string | null
                    severity?: string | null
                    status?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "issues_user_id_fkey"
                        columns: ["user_id"]
                        isOneToOne: false
                        referencedRelation: "users"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "issues_room_id_fkey"
                        columns: ["room_id"]
                        isOneToOne: false
                        referencedRelation: "rooms"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
    }
}

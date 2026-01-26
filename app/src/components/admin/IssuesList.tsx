import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertTriangle, Trash2, AlertOctagon, Info } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Database } from '@/types/database'
import { format, parseISO } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { NativeSelect } from '@/components/ui/native-select'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

// Define a type for the joined issue data
type Issue = Database['public']['Tables']['issues']['Row'] & {
    profiles?: { full_name: string, email: string } | null
    rooms?: { name: string } | null
}

export function IssuesList() {
    const { toast } = useToast()
    const queryClient = useQueryClient()
    const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('open')

    const { data: issues, isLoading } = useQuery({
        queryKey: ['admin-issues'],
        queryFn: async () => {
            // We join profiles (user_id) and rooms (room_id)
            const { data, error } = await supabase
                .from('issues')
                .select('*, profiles:user_id(full_name, email), rooms:room_id(name)')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as unknown as Issue[]
        }
    })

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('issues')
                .update({ status: newStatus })
                .eq('id', id)

            if (error) throw error

            toast({ title: `Issue marked as ${newStatus}` })
            queryClient.invalidateQueries({ queryKey: ['admin-issues'] })
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message })
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this report?')) return
        try {
            const { error } = await supabase
                .from('issues')
                .delete()
                .eq('id', id)

            if (error) throw error

            toast({ title: "Report deleted" })
            queryClient.invalidateQueries({ queryKey: ['admin-issues'] })
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message })
        }
    }

    const filteredIssues = issues?.filter(issue => {
        if (filterStatus === 'all') return true
        if (filterStatus === 'open') return issue.status === 'open' || issue.status === 'in_progress'
        return issue.status === 'resolved'
    })

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'high': return <AlertOctagon className="w-4 h-4 text-red-500" />
            case 'medium': return <AlertTriangle className="w-4 h-4 text-orange-500" />
            case 'low': return <Info className="w-4 h-4 text-blue-500" />
            default: return <Info className="w-4 h-4 text-gray-400" />
        }
    }

    if (isLoading) return <div>Loading issues...</div>

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div className="space-y-1">
                    <CardTitle>Reported Issues</CardTitle>
                    <CardDescription>Track and manage facility problems reported by users.</CardDescription>
                </div>
                <div className="w-[200px]">
                    <NativeSelect
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="h-9"
                    >
                        <option value="all">All Status</option>
                        <option value="open">Open & In Progress</option>
                        <option value="resolved">Resolved</option>
                    </NativeSelect>
                </div>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Severity</TableHead>
                                <TableHead>Issue / Description</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Reported By</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredIssues?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No issues found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {filteredIssues?.map((issue) => (
                                <TableRow key={issue.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2" title={`Severity: ${issue.severity}`}>
                                            {getSeverityIcon(issue.severity || 'low')}
                                            <span className="capitalize text-xs font-medium text-gray-500">{issue.severity}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[300px]">
                                        <div className="font-medium text-gray-900">{issue.title}</div>
                                        <div className="text-xs text-gray-500 line-clamp-1 truncate" title={issue.description || ''}>
                                            {issue.description}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {issue.rooms ? (
                                            <Badge variant="outline">{issue.rooms.name}</Badge>
                                        ) : (
                                            <span className="text-gray-400 italic text-sm">General</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <div>{issue.profiles?.full_name || 'Unknown User'}</div>
                                            <div className="text-xs text-gray-400">{issue.profiles?.email}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-gray-500">
                                        {format(parseISO(issue.created_at), 'MMM d, yyyy')}
                                    </TableCell>
                                    <TableCell>
                                        {issue.status === 'resolved' ? (
                                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">Resolved</Badge>
                                        ) : (
                                            <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none animate-pulse">Open</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {issue.status !== 'resolved' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-green-600 border-green-200 hover:bg-green-50"
                                                    onClick={() => handleUpdateStatus(issue.id, 'resolved')}
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" /> Resolve
                                                </Button>
                                            )}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-gray-400 hover:text-red-500"
                                                onClick={() => handleDelete(issue.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}

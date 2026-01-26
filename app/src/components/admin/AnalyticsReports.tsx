import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Database } from '@/types/database'
import { useEffect, useState } from 'react'

type Room = Database['public']['Tables']['rooms']['Row']

// Mock data generator since we don't have historical data API yet
// In production, fetch this from Supabase RPCs
const generateMockData = (rooms: Room[]) => {
    // 1. Utilization
    const utilizationData = rooms.map(r => ({
        name: r.name,
        hours: Math.floor(Math.random() * 50) + 10 // Mock hours/week
    }))

    // 2. Peak Hours
    const peakHoursData = [
        { hour: '08:00', bookings: 12 },
        { hour: '10:00', bookings: 28 }, // Peak
        { hour: '12:00', bookings: 15 }, // Lunch drop
        { hour: '14:00', bookings: 32 }, // Peak
        { hour: '16:00', bookings: 20 },
        { hour: '18:00', bookings: 5 },
    ]

    // 3. Cancellations
    const cancellationData = [
        { name: 'Completed', value: 85 },
        { name: 'Cancelled', value: 15 },
    ]

    return { utilizationData, peakHoursData, cancellationData }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

interface AnalyticsReportsProps {
    rooms: Room[]
}

export function AnalyticsReports({ rooms }: AnalyticsReportsProps) {
    const [data, setData] = useState<{
        utilizationData: any[]
        peakHoursData: any[]
        cancellationData: any[]
    } | null>(null)

    useEffect(() => {
        if (rooms.length > 0) {
            setData(generateMockData(rooms))
        }
    }, [rooms])

    if (!data) return <div>Loading reports...</div>

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">System Performance</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Room Utilization - Bar Chart */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Room Utilization</CardTitle>
                        <CardDescription>
                            Total booked hours per room this week.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={data.utilizationData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}h`}
                                />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="hours" fill="#0f172a" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Cancellation Rate - Pie Chart */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Completion Rate</CardTitle>
                        <CardDescription>
                            Bookings completed vs cancelled.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={350}>
                            <PieChart>
                                <Pie
                                    data={data.cancellationData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.cancellationData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#22c55e' : '#ef4444'} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Peak Hours - Line Chart */}
            <Card>
                <CardHeader>
                    <CardTitle>Peak Booking Hours</CardTitle>
                    <CardDescription>
                        Average number of bookings by time of day.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={data.peakHoursData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="hour"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip />
                            <Line type="monotone" dataKey="bookings" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    )
}

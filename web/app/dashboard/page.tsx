'use client';

import { useState, useEffect } from 'react';

export default function Dashboard() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [stats, setStats] = useState({ total: 0, peakHour: 'N/A', topCuisine: 'N/A' });
    const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);

    const fetchBookings = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/bookings');
            const data = await response.json();
            setBookings(data);
            calculateStats(data);
        } catch (error) {
            console.error('Error fetching bookings:', error);
        }
    };

    const calculateStats = (data: any[]) => {
        if (!data.length) return;

        // Peak Hour
        const hours = data.map(b => b.bookingTime.split(':')[0]);
        const hourCounts: any = {};
        let maxCount = 0;
        let peak = 'N/A';
        hours.forEach(h => {
            hourCounts[h] = (hourCounts[h] || 0) + 1;
            if (hourCounts[h] > maxCount) {
                maxCount = hourCounts[h];
                peak = `${h}:00`;
            }
        });

        // Top Cuisine
        const cuisines = data.map(b => b.cuisinePreference);
        const cuisineCounts: any = {};
        let maxCuisineCount = 0;
        let topCuisine = 'N/A';
        cuisines.forEach(c => {
            cuisineCounts[c] = (cuisineCounts[c] || 0) + 1;
            if (cuisineCounts[c] > maxCuisineCount) {
                maxCuisineCount = cuisineCounts[c];
                topCuisine = c;
            }
        });

        setStats({
            total: data.length,
            peakHour: peak,
            topCuisine: topCuisine
        });
    };

    const exportToCSV = () => {
        const headers = ['Customer', 'Guests', 'Date', 'Time', 'Cuisine', 'Seating', 'Status', 'Language'];
        const rows = bookings.map(b => [
            b.customerName,
            b.numberOfGuests,
            new Date(b.bookingDate).toLocaleDateString(),
            b.bookingTime,
            b.cuisinePreference,
            b.seatingPreference,
            b.status,
            b.language
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "bookings_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        fetchBookings();
        const interval = setInterval(fetchBookings, 5000);
        return () => clearInterval(interval);
    }, []);

    // Calendar Logic: Get slots for selected date
    const getSlotsForDate = (date: string) => {
        // Filter bookings for the selected date (comparing YYYY-MM-DD)
        const dayBookings = bookings.filter(b => new Date(b.bookingDate).toISOString().split('T')[0] === date);

        const slots = [];
        for (let i = 12; i <= 22; i++) { // 12 PM to 10 PM
            const timeLabel = `${i}:00`;

            // Check if any booking exists in this hour (e.g., 19:00, 19:30, 19:45 all block the 19:00 slot)
            const isBooked = dayBookings.some(b => {
                if (b.status !== 'confirmed') return false;
                const bookingHour = parseInt(b.bookingTime.split(':')[0]);
                return bookingHour === i;
            });

            slots.push({ time: timeLabel, isBooked });
        }
        return slots;
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Restaurant Dashboard</h1>
                    <button onClick={exportToCSV} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded shadow transition">
                        Export Report (CSV)
                    </button>
                </div>

                {/* Analytics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-gray-500 text-sm font-medium uppercase">Total Bookings</h3>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-gray-500 text-sm font-medium uppercase">Peak Hour</h3>
                        <p className="text-3xl font-bold text-indigo-600 mt-2">{stats.peakHour}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="text-gray-500 text-sm font-medium uppercase">Top Cuisine</h3>
                        <p className="text-3xl font-bold text-green-600 mt-2">{stats.topCuisine}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Bookings Table */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-lg font-semibold text-gray-800">Recent Bookings</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {bookings.map((booking: any) => (
                                        <tr key={booking._id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.customerName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(booking.bookingDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.bookingTime}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Calendar / Availability */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-800 mb-4">Check Availability</h2>
                        <input
                            type="date"
                            value={checkDate}
                            onChange={(e) => setCheckDate(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                            {getSlotsForDate(checkDate).map((slot) => (
                                <div
                                    key={slot.time}
                                    className={`p-2 rounded text-center text-sm font-medium ${slot.isBooked
                                        ? 'bg-red-100 text-red-800 cursor-not-allowed'
                                        : 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer'
                                        }`}
                                >
                                    {slot.time}
                                    {slot.isBooked && <span className="block text-xs font-normal">Booked</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

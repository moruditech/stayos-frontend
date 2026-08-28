'use client';

/**
 * Occupancy report (M-06).
 *
 * Renders exactly what `GET /reports/occupancy` returns:
 * { from, to, totalRooms, totalRoomNights, bookedRoomNights, occupancyRate, byType }
 *
 * Deliberately does NOT show ADR or RevPAR — the backend does not compute
 * either today (see stayos-audit-report.md M-15). If getOccupancy is
 * extended to return them, add the two figures back here.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@stayos/api-client';
import { SkeletonLoader, ReadOnlyField, Icons } from '@stayos/ui';

interface OccupancyByType {
  _id: string;
  roomCount: number;
}

interface OccupancyReport {
  from: string;
  to: string;
  totalRooms: number;
  totalRoomNights: number;
  bookedRoomNights: number;
  occupancyRate: number;
  byType: OccupancyByType[];
}

export default function OccupancyReportPage(): React.ReactElement {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = Object.fromEntries(Object.entries({ from, to }).filter(([, v]) => v));

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'occupancy', params],
    queryFn: () => api.reports.getOccupancy(params) as unknown as Promise<OccupancyReport>,
  });

  return (
    <div data-page="report-occupancy">
      <div data-page-header>
        <div>
          <Link href="/reports" data-breadcrumb><Icons.ChevronLeft data-breadcrumb-icon aria-hidden="true" /> Reports</Link>
          <h1>Occupancy</h1>
        </div>
      </div>

      <div data-filter-bar>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-filter-input placeholder="From" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} data-filter-input placeholder="To" />
      </div>

      {isLoading || !data ? (
        <SkeletonLoader rows={6} />
      ) : (
        <>
          <div data-stat-grid>
            <ReadOnlyField label="Occupancy rate" value={`${data.occupancyRate}%`} />
            <ReadOnlyField label="Booked room-nights" value={data.bookedRoomNights} />
            <ReadOnlyField label="Available room-nights" value={data.totalRoomNights} />
            <ReadOnlyField label="Total rooms" value={data.totalRooms} />
          </div>

          <section data-report-section>
            <h2>By room type</h2>
            <table data-table>
              <thead>
                <tr>
                  <th>Room type</th>
                  <th>Room count</th>
                </tr>
              </thead>
              <tbody>
                {data.byType.map((row) => (
                  <tr key={row._id}>
                    <td>{row._id}</td>
                    <td>{row.roomCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

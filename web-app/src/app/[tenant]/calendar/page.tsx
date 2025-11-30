import { TeamCalendar } from '@/components/TeamCalendar';

export default function CalendarPage() {
    return (
        <div className="container mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Calendar</h1>
                <p className="text-muted-foreground">Manage team schedule and availability</p>
            </div>

            <TeamCalendar />
        </div>
    );
}

import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import Card from '../../shared/components/Card';
import Button from '../../shared/components/Button';
import { Spinner, EmptyState } from '../../shared/components/States';
import { useToast } from '../../shared/context/ToastContext';
import { dbSubscribe, dbUpdate } from '../../shared/data/db';
import { timeAgo } from '../../shared/utils/format';

const TONE = { critical: 'bg-red-50 text-lifeline-red', high: 'bg-amber-50 text-amber-600', moderate: 'bg-blue-50 text-blue-600' };

export default function HospitalNotifications() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const unsub = dbSubscribe('notifications', (list) => {
      setItems(list.filter((n) => n.scope === 'hospital').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const markRead = async (n) => {
    try { await dbUpdate('notifications', n.id, { read: !n.read }); }
    catch { toast.error('Could not update notification.'); }
  };

  const markAllRead = async () => {
    try { await Promise.all(items.filter((n) => !n.read).map((n) => dbUpdate('notifications', n.id, { read: true }))); toast.success('All notifications marked as read.'); }
    catch { toast.error('Could not update notifications.'); }
  };

  if (loading) return <Spinner label="Loading notifications…" />;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" icon={CheckCheck} onClick={markAllRead} disabled={!items.some((n) => !n.read)}>Mark all read</Button>
      </div>
      <Card padded={false}>
        {items.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
        ) : (
          <ul className="divide-y divide-lifeline-border">
            {items.map((n) => (
              <li key={n.id} className={`px-5 py-4 flex items-start gap-3 ${!n.read ? 'bg-red-50/30' : ''}`}>
                <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${n.read ? 'bg-slate-300' : 'bg-lifeline-red'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${n.read ? 'text-lifeline-sub' : 'font-semibold text-lifeline-ink'}`}>{n.message}</p>
                  <p className="text-xs text-lifeline-sub mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                <button onClick={() => markRead(n)} className="text-xs font-semibold text-lifeline-red shrink-0 hover:underline">
                  {n.read ? 'Mark unread' : 'Mark read'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

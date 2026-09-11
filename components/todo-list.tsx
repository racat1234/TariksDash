'use client';

import { Check, Loader2, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { fireConfetti } from '@/lib/confetti';

type Task = { id: number; title: string; completed: boolean; source: 'web' | 'telegram'; createdAt: string };

export function TodoList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [telegram, setTelegram] = useState<'checking' | 'ready' | 'unconfigured'>('checking');
  const doneCount = useMemo(() => tasks.filter((task) => task.completed).length, [tasks]);

  const loadTasks = useCallback(async () => {
    const response = await fetch('/api/tasks');
    if (response.ok) setTasks((await response.json()).tasks);
    setLoading(false);
  }, []);

  const syncTelegram = useCallback(async () => {
    const response = await fetch('/api/telegram/sync', { method: 'POST' });
    if (!response.ok) return;
    const result = await response.json() as { configured: boolean; imported: number };
    setTelegram(result.configured ? 'ready' : 'unconfigured');
    if (result.imported) await loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    void loadTasks();
    void syncTelegram();
    const runSync = () => { if (document.visibilityState === 'visible') void syncTelegram(); };
    const timer = window.setInterval(runSync, 8_000);
    window.addEventListener('focus', runSync);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', runSync); };
  }, [loadTasks, syncTelegram]);

  async function addTask(event: FormEvent) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) return;
    setSaving(true);
    const response = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: nextTitle }) });
    if (response.ok) {
      const { task } = await response.json();
      setTasks((current) => [task, ...current]);
      setTitle('');
    }
    setSaving(false);
  }

  async function toggle(task: Task, source?: HTMLElement) {
    const completed = !task.completed;
    if (completed) { const bounds = source?.getBoundingClientRect(); fireConfetti(bounds ? { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 } : undefined); }
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed } : item));
    const response = await fetch('/api/tasks', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: task.id, completed }) });
    if (!response.ok) setTasks((current) => current.map((item) => item.id === task.id ? task : item));
  }

  async function remove(id: number) {
    const previous = tasks;
    setTasks((current) => current.filter((task) => task.id !== id));
    const response = await fetch(`/api/tasks?id=${id}`, { method: 'DELETE' });
    if (!response.ok) setTasks(previous);
  }

  return (
    <section id="work">
      <div className="section-heading"><div><p className="eyebrow">From anywhere</p><h2>Your to-do list</h2></div><span>{doneCount} of {tasks.length} complete</span></div>
      <form onSubmit={addTask} className="mt-4 flex gap-2"><input className="todo-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add something to your list…" aria-label="New task" /><button className="todo-add" type="submit" disabled={!title.trim() || saving} aria-label="Add task">{saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}</button></form>
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-card">
        {loading ? <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Loading your list</div> : tasks.length === 0 ? <div className="px-5 py-10 text-center"><p className="font-medium">A clean slate.</p><p className="mt-1 text-sm text-muted-foreground">Add a task here or send one from Telegram.</p></div> : tasks.map((task) => <div key={task.id} className="focus-row group"><button onClick={(event) => toggle(task, event.currentTarget)} className={`check-circle ${task.completed ? 'check-circle-done' : ''}`} aria-label={task.completed ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}>{task.completed && <Check />}</button><button onClick={(event) => toggle(task, event.currentTarget)} className="min-w-0 flex-1 text-left"><span className={`block font-medium ${task.completed ? 'text-muted-foreground line-through' : ''}`}>{task.title}</span><span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">{task.source === 'telegram' && <MessageCircle className="size-3" />}{task.source === 'telegram' ? 'From Telegram' : 'Added here'}</span></button><button onClick={() => remove(task.id)} className="rounded-lg p-2 text-muted-foreground opacity-60 transition hover:bg-secondary hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Delete ${task.title}`}><Trash2 className="size-4" /></button></div>)}
      </div>
      <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-muted-foreground"><span className="flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${telegram === 'ready' ? 'bg-emerald-400' : 'bg-amber-400'}`} />{telegram === 'ready' ? 'Telegram connected' : telegram === 'checking' ? 'Checking Telegram' : 'Telegram needs setup'}</span><span>Checks every 8 seconds</span></div>
    </section>
  );
}

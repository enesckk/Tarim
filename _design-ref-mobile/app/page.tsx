'use client'

import { BottomNav, type Tab } from '@/components/producer/bottom-nav'
import { ChatView } from '@/components/producer/chat-view'
import { NotificationsView } from '@/components/producer/notifications-view'
import { ProcessView } from '@/components/producer/process-view'
import { ProfileView } from '@/components/producer/profile-view'
import {
  ReportProblemSheet,
  type ProblemDraft,
} from '@/components/producer/report-problem-sheet'
import { TaskDetail } from '@/components/producer/task-detail'
import { TaskList } from '@/components/producer/task-list'
import {
  initialMessages,
  initialNotifications,
  initialTasks,
  workflow,
  workflowSteps,
  type AppNotification,
  type ChatMessage,
  type Task,
} from '@/lib/producer-data'
import { cn } from '@/lib/utils'
import { useMemo, useState } from 'react'

function now() {
  return new Date().toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

let idCounter = 100
const nextId = () => `x${idCounter++}`

export default function Page() {
  const [tab, setTab] = useState<Tab>('gorevler')
  const [gorevlerSub, setGorevlerSub] = useState<'yapilacaklar' | 'surec'>(
    'yapilacaklar',
  )
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [notifications, setNotifications] =
    useState<AppNotification[]>(initialNotifications)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [problemOpen, setProblemOpen] = useState(false)
  const [problemContext, setProblemContext] = useState<Task | null>(null)

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  )

  const unreadCount = notifications.filter((n) => !n.read).length
  const openCount = tasks.filter(
    (t) => t.status === 'geciken' || t.status === 'bugun',
  ).length

  // Reflect live task completion in the process timeline.
  const derivedSteps = useMemo(
    () =>
      workflowSteps.map((step) => {
        if (!step.taskId) return step
        const linked = tasks.find((t) => t.id === step.taskId)
        if (linked?.status === 'tamamlandi') {
          return {
            ...step,
            state: 'bitti' as const,
            doneLabel: linked.completedAt ?? step.doneLabel ?? 'Tamamlandı',
          }
        }
        return step
      }),
    [tasks],
  )

  function expertReplyLater(text: string) {
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          from: 'uzman',
          text,
          time: now(),
          kind: 'mesaj',
        },
      ])
    }, 1400)
  }

  function completeTask(task: Task, photos: string[], quantity?: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              status: 'tamamlandi',
              photos: photos.length ? photos : t.photos,
              quantity,
              completedAt: `Az önce ${now()}`,
              dueLabel: 'Az önce tamamlandı',
            }
          : t,
      ),
    )
    setSelectedTaskId(null)
  }

  function askExpert(task: Task) {
    setSelectedTaskId(null)
    setTab('sohbet')
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        from: 'uretici',
        text: `"${task.title}" hakkında bir sorum var.`,
        time: now(),
        kind: 'mesaj',
        topic: task.title,
      },
    ])
    expertReplyLater('Tabii, yardımcı olayım. Tam olarak nerede takıldınız?')
  }

  function openProblem(task: Task | null) {
    setProblemContext(task)
    setProblemOpen(true)
  }

  function submitProblem(draft: ProblemDraft) {
    setProblemOpen(false)
    setSelectedTaskId(null)
    setTab('sohbet')
    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        from: 'uretici',
        text: draft.description
          ? `${draft.title}\n${draft.description}`
          : draft.title,
        photo: draft.photos[0],
        time: now(),
        kind: 'sorun',
        topic: draft.taskTitle,
      },
    ])
    expertReplyLater(
      'Bildirdiğiniz için teşekkürler, sorunu inceliyorum. En kısa sürede dönüş yapacağım.',
    )
  }

  function openNotification(n: AppNotification) {
    setNotifications((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
    )
    if (n.taskId) {
      setSelectedTaskId(n.taskId)
      setTab('gorevler')
    } else if (n.type === 'uzman') {
      setTab('sohbet')
    }
  }

  function handleTabChange(next: Tab) {
    if (next === 'gorevler') setSelectedTaskId(null)
    setTab(next)
  }

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-background">
      <main className="flex min-h-0 flex-1 flex-col">
        {tab === 'gorevler' &&
          (selectedTask ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <TaskDetail
                task={selectedTask}
                onBack={() => setSelectedTaskId(null)}
                onComplete={(photos, quantity) =>
                  completeTask(selectedTask, photos, quantity)
                }
                onAskExpert={askExpert}
                onReportProblem={openProblem}
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <header className="flex flex-col gap-3 px-4 pb-3 pt-1">
                <div className="flex flex-col gap-1 px-1">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">
                    {gorevlerSub === 'yapilacaklar' ? 'Görevlerim' : 'Sürecim'}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {gorevlerSub === 'yapilacaklar'
                      ? `${openCount} açık görev seni bekliyor`
                      : `${workflow.name} — genel yol haritan`}
                  </p>
                </div>

                <div className="flex rounded-2xl bg-muted p-1">
                  {(
                    [
                      ['yapilacaklar', 'Yapılacaklar'],
                      ['surec', 'Süreç'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGorevlerSub(value)}
                      className={cn(
                        'flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors',
                        gorevlerSub === value
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground',
                      )}
                      aria-pressed={gorevlerSub === value}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {gorevlerSub === 'yapilacaklar' ? (
                  <TaskList
                    tasks={tasks}
                    onOpenTask={(id) => setSelectedTaskId(id)}
                  />
                ) : (
                  <ProcessView
                    steps={derivedSteps}
                    workflowName={workflow.name}
                    season={workflow.season}
                    onOpenTask={(id) => {
                      setGorevlerSub('yapilacaklar')
                      setSelectedTaskId(id)
                    }}
                  />
                )}
              </div>
            </div>
          ))}

        {tab === 'sohbet' && (
          <ChatView
            messages={messages}
            onSend={(text) => {
              setMessages((prev) => [
                ...prev,
                {
                  id: nextId(),
                  from: 'uretici',
                  text,
                  time: now(),
                  kind: 'mesaj',
                },
              ])
              expertReplyLater('Anladım, not aldım. Devam edin lütfen.')
            }}
            onReportProblem={() => openProblem(null)}
          />
        )}

        {tab === 'bildirimler' && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <NotificationsView
              notifications={notifications}
              onOpen={openNotification}
            />
          </div>
        )}

        {tab === 'profil' && (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ProfileView onLogout={() => handleTabChange('gorevler')} />
          </div>
        )}
      </main>

      <BottomNav
        active={tab}
        onChange={handleTabChange}
        badges={{ bildirimler: unreadCount }}
      />

      <ReportProblemSheet
        open={problemOpen}
        contextTask={problemContext}
        onClose={() => setProblemOpen(false)}
        onSubmit={submitProblem}
      />
    </div>
  )
}

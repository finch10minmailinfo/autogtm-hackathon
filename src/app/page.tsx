"use client";

import Link from "next/link";
import { useState } from "react";

type Status = "done" | "active" | "todo";

type RitualTask = {
  id: string;
  duration: string;
  title: string;
  description: string;
  status: Status;
  image?: string;
};

type RitualSection = {
  label: string;
  range: string;
  tasks: RitualTask[];
};

const sections: RitualSection[] = [
  {
    label: "Morning",
    range: "6 - 9AM",
    tasks: [
      {
        id: "listen",
        duration: "7 MIN",
        title: "Listen",
        description: "Review overnight market movement before the day begins.",
        status: "done",
        image:
          "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=240&q=80",
      },
      {
        id: "frame",
        duration: "5 MIN",
        title: "Frame",
        description: "Choose the single buyer tension worth shaping today.",
        status: "done",
      },
    ],
  },
  {
    label: "Day",
    range: "9AM - 6PM",
    tasks: [
      {
        id: "signal",
        duration: "1 MIN",
        title: "Signal",
        description: "Let the agents turn intent, reviews, and gaps into a brief.",
        status: "active",
        image:
          "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=240&q=80",
      },
    ],
  },
  {
    label: "Evening",
    range: "6 - 9PM",
    tasks: [
      {
        id: "compose",
        duration: "5 MIN",
        title: "Compose",
        description: "Draft the broadcast and outreach sequence with restraint.",
        status: "done",
      },
      {
        id: "approve",
        duration: "1 MIN",
        title: "Approve",
        description: "Review final copy, source notes, and the staged post.",
        status: "active",
        image:
          "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=240&q=80",
      },
    ],
  },
  {
    label: "Night",
    range: "9PM",
    tasks: [
      {
        id: "archive",
        duration: "3 MIN",
        title: "Archive",
        description: "Save what performed and let tomorrow's ritual begin clean.",
        status: "todo",
      },
    ],
  },
];

const days = ["13", "14", "15", "TODAY", "17", "18", "19"];

export default function Home() {
  const [tasks, setTasks] = useState(() =>
    sections.flatMap((section) => section.tasks.map((task) => [task.id, task.status] as const))
  );
  const taskState = Object.fromEntries(tasks) as Record<string, Status>;

  function toggleTask(id: string) {
    setTasks((current) =>
      current.map(([taskId, status]) =>
        taskId === id ? [taskId, status === "done" ? "todo" : "done"] : [taskId, status]
      )
    );
  }

  return (
    <main className="ritual-page">
      <section className="glass-panel" aria-label="AutoGTM daily ritual dashboard">
        <TopBar />

        <div className="ritual-layout">
          <IconRail />

          <div className="schedule-column" aria-label="Daily GTM ritual schedule">
            {sections.map((section) => (
              <RitualGroup
                key={section.label}
                section={section}
                taskState={taskState}
                onToggle={toggleTask}
              />
            ))}
          </div>

          <HeroCard />
        </div>
      </section>
    </main>
  );
}

function TopBar() {
  return (
    <header className="top-bar">
      <Link className="brand" href="/" aria-label="AutoGTM home">
        autogtm
      </Link>

      <nav className="day-strip" aria-label="Week days">
        {days.map((day, index) => (
          <button
            key={day}
            className={`day-pill ${day === "TODAY" ? "is-today" : ""} ${index < 3 ? "is-past" : ""}`}
            type="button"
          >
            {day}
          </button>
        ))}
      </nav>

      <button className="weeks-toggle" type="button">
        <CalendarIcon />
        <span>WEEKS</span>
      </button>
    </header>
  );
}

function IconRail() {
  const icons = [
    { label: "Home", icon: <HomeIcon />, active: true },
    { label: "Notes", icon: <BookIcon /> },
    { label: "Library", icon: <BagIcon /> },
    { label: "Saved", icon: <BookmarkIcon /> },
    { label: "Profile", icon: <ProfileIcon /> },
  ];

  return (
    <nav className="icon-rail" aria-label="Primary">
      {icons.map((item) => (
        <button
          key={item.label}
          className={`rail-button ${item.active ? "is-active" : ""}`}
          type="button"
          aria-label={item.label}
        >
          {item.icon}
        </button>
      ))}
    </nav>
  );
}

function RitualGroup({
  section,
  taskState,
  onToggle,
}: {
  section: RitualSection;
  taskState: Record<string, Status>;
  onToggle: (id: string) => void;
}) {
  return (
    <section className="ritual-group">
      <div className="group-heading">
        <p>{section.label}</p>
        <span>{section.range}</span>
      </div>

      <div className="task-stack">
        {section.tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            status={taskState[task.id] ?? task.status}
            onToggle={() => onToggle(task.id)}
          />
        ))}
      </div>
    </section>
  );
}

function TaskCard({
  task,
  status,
  onToggle,
}: {
  task: RitualTask;
  status: Status;
  onToggle: () => void;
}) {
  return (
    <article className="task-card">
      <div className="task-meta">
        <span>{task.duration}</span>
        {task.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={task.image} alt="" />
        )}
      </div>

      <div className="task-copy">
        <h2>{task.title}</h2>
        <p>{task.description}</p>
      </div>

      <button
        className={`status-circle status-${status}`}
        type="button"
        aria-label={`Mark ${task.title} ${status === "done" ? "incomplete" : "done"}`}
        onClick={onToggle}
      >
        {status === "done" && <CheckIcon />}
      </button>
    </article>
  );
}

function HeroCard() {
  return (
    <aside className="hero-card" aria-label="Featured ritual">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=1100&q=85"
        alt="Black and white studio portrait"
      />
      <div className="hero-scrim" />
      <div className="hero-intro">
        <p>Let&apos;s begin with signal</p>
        <span>WELCOME · 2 MIN</span>
      </div>
      <div className="hero-title">
        <span>WEEK 1</span>
        <h1>Finding your Signal</h1>
      </div>
    </aside>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 11.5 12 5l8 6.5v7a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21z" />
      <path d="M5 5.5V21M8 7h8" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.5 8.5h11l-.8 10A2.5 2.5 0 0 1 14.2 21H9.8a2.5 2.5 0 0 1-2.5-2.5z" />
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5V21l-5-3-5 3z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.5v3M17 3.5v3M4.5 9h15M6 5h12a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 18 20H6a1.5 1.5 0 0 1-1.5-1.5v-12A1.5 1.5 0 0 1 6 5z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 12.5 4 4L18.5 8" />
    </svg>
  );
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { GraduationCap, Car, Home, Cake, Target } from "lucide-react"
import { useChildren } from "@/context/children-context"
import { parseGoalUnlockDate } from "@/lib/goal-dates"

const iconByGoalName: Record<string, typeof GraduationCap> = {
  "College Fund": GraduationCap,
  "Education Fund": GraduationCap,
  "First Car": Car,
  "First Car Fund": Car,
  "Future Home": Home,
  "18th Birthday": Cake,
  "Summer Camp": Target,
}

export function UpcomingMilestones() {
  const { children } = useChildren()

  const milestones = children.flatMap((child) =>
    child.goals
      .filter((g) => g.locked)
      .map((goal) => {
        const date = parseGoalUnlockDate(goal.unlockDate)
        return {
          key: `${child.name}-${goal.id ?? goal.name}-${goal.unlockDate}`,
          child: child.name,
          avatar: child.avatar,
          event: goal.name,
          date: date
            ? date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : goal.unlockDate,
          amount: `$${goal.current.toLocaleString()}`,
          icon: iconByGoalName[goal.name] ?? Target,
          daysUntil: date
            ? Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 0,
        }
      })
  )
  const sorted = [...milestones].sort((a, b) => a.daysUntil - b.daysUntil).filter((m) => m.daysUntil > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Upcoming Unlocks</CardTitle>
        <p className="text-sm text-muted-foreground">
          Milestones where funds will become available
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No upcoming unlocks. Add children and lock SOL to see milestones here.
          </p>
        ) : (
          sorted.map((milestone) => (
            <div
              key={milestone.key}
              className="flex items-center justify-between rounded-xl bg-muted/50 p-4 transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={milestone.avatar} alt={milestone.child} />
                    <AvatarFallback>
                      {milestone.child.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <milestone.icon className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
                <div>
                  <p className="font-medium text-foreground">{milestone.event}</p>
                  <p className="text-sm text-muted-foreground">
                    {milestone.child} • {milestone.date}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">{milestone.amount}</p>
                <p className="text-sm text-muted-foreground">
                  {milestone.daysUntil} days
                </p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

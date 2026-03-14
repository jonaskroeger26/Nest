"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useActions } from "@/context/actions-context"
import { Plus, Lock, Unlock } from "lucide-react"

interface Goal {
  name: string
  current: number
  target: number
  locked: boolean
  unlockDate: string
}

interface ChildCardProps {
  name: string
  age: number
  avatar: string
  totalSaved: number
  goals: Goal[]
}

export function ChildCard({ name, age, avatar, totalSaved, goals }: ChildCardProps) {
  const { openAddGoal } = useActions()
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-primary/20">
              <AvatarImage src={avatar} alt={name} />
              <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{name}</h3>
              <p className="text-sm text-muted-foreground">{age} years old</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">
              ${totalSaved.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Total saved</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal, index) => (
          <div key={index} className="rounded-xl bg-muted/50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {goal.locked ? (
                  <Lock className="h-4 w-4 text-primary" />
                ) : (
                  <Unlock className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="font-medium text-foreground">{goal.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                Unlocks {goal.unlockDate}
              </span>
            </div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                ${goal.current.toLocaleString()} of ${goal.target.toLocaleString()}
              </span>
              <span className="font-medium text-primary">
                {Math.round((goal.current / goal.target) * 100)}%
              </span>
            </div>
            <Progress 
              value={(goal.current / goal.target) * 100} 
              className="h-2"
            />
          </div>
        ))}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => openAddGoal(name)}
        >
          <Plus className="h-4 w-4" />
          Add New Goal
        </Button>
      </CardContent>
    </Card>
  )
}

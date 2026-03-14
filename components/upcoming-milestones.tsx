"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { GraduationCap, Car, Home, Cake } from "lucide-react"

const milestones = [
  {
    child: "Emma",
    avatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=emma",
    event: "18th Birthday",
    date: "Aug 15, 2026",
    amount: "$5,000",
    icon: Cake,
    daysUntil: 154,
  },
  {
    child: "Liam",
    avatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=liam",
    event: "First Car Fund",
    date: "Dec 20, 2027",
    amount: "$8,000",
    icon: Car,
    daysUntil: 647,
  },
  {
    child: "Emma",
    avatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=emma",
    event: "College Fund",
    date: "Sep 1, 2028",
    amount: "$15,000",
    icon: GraduationCap,
    daysUntil: 901,
  },
  {
    child: "Sophia",
    avatar: "https://api.dicebear.com/7.x/lorelei/svg?seed=sophia",
    event: "Future Home",
    date: "Jun 15, 2035",
    amount: "$25,000",
    icon: Home,
    daysUntil: 3380,
  },
]

export function UpcomingMilestones() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Upcoming Unlocks</CardTitle>
        <p className="text-sm text-muted-foreground">
          Milestones where funds will become available
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {milestones.map((milestone, index) => (
          <div
            key={index}
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
        ))}
      </CardContent>
    </Card>
  )
}

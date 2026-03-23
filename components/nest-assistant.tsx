"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import {
  Bird,
  HelpCircle,
  Lock,
  MessageCircle,
  Send,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  NEST_FAQ_ENTRIES,
  answerNestQuestion,
  type NestFaqEntry,
} from "@/lib/nest-help-faq"

const AUTO_TOUR_STORAGE_KEY = "nest_auto_tour_dismissed_v1"

export type NestAssistantTab = "chat" | "tour"

type TutorialStep = {
  title: string
  body: string
  Icon: LucideIcon
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome to Nest",
    body: "Nest helps you set aside crypto for your kids on Solana—with clear unlock rules and transparent on-chain vaults.",
    Icon: Bird,
  },
  {
    title: "Your wallet, your keys",
    body: "Connect Phantom (or another Solana wallet). You’ll sign transactions yourself; Nest never sees your seed phrase.",
    Icon: Wallet,
  },
  {
    title: "Children & beneficiaries",
    body: "Add each child and their wallet address. That beneficiary is who can withdraw after the vault unlocks—plan addresses carefully.",
    Icon: Users,
  },
  {
    title: "Lock funds on purpose",
    body: "Use Lock / Add SOL to fund a vault and pick an unlock time. Optional mSOL can earn yield while funds stay locked.",
    Icon: Lock,
  },
  {
    title: "Gifts & auto-save",
    body: "Share a vault QR so family can gift into the vault (not the hot wallet). Auto-save can move escrowed SOL on a schedule via a relayer you configure.",
    Icon: Sparkles,
  },
]

type ChatMsg = { role: "user" | "assistant"; text: string; title?: string }

function markAutoTourHandled() {
  try {
    localStorage.setItem(AUTO_TOUR_STORAGE_KEY, "1")
  } catch {
    /* ignore */
  }
}

function shouldOfferAutoTour(): boolean {
  try {
    return !localStorage.getItem(AUTO_TOUR_STORAGE_KEY)
  } catch {
    return false
  }
}

export function NestAssistant() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<NestAssistantTab>("chat")
  const [stepIndex, setStepIndex] = useState(0)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMsg[]>(() => [
    {
      role: "assistant",
      title: "Hi! I’m the Nest guide",
      text: "Ask in your own words, or tap a suggested question. I match common questions—there’s no live AI backend.",
    },
  ])
  const autoOfferPendingRef = useRef(false)
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openAssistant = useCallback((nextTab: NestAssistantTab) => {
    setTab(nextTab)
    setOpen(true)
  }, [])

  useEffect(() => {
    const onGlobalOpen = (e: Event) => {
      const ce = e as CustomEvent<{ tab?: NestAssistantTab }>
      openAssistant(ce.detail?.tab ?? "chat")
    }
    window.addEventListener("nest-open-assistant", onGlobalOpen)
    return () => window.removeEventListener("nest-open-assistant", onGlobalOpen)
  }, [openAssistant])

  useEffect(() => {
    if (pathname !== "/app") return
    if (!shouldOfferAutoTour()) return
    autoTimerRef.current = setTimeout(() => {
      autoOfferPendingRef.current = true
      setTab("tour")
      setStepIndex(0)
      setOpen(true)
    }, 900)
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
  }, [pathname])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next && autoOfferPendingRef.current) {
      markAutoTourHandled()
      autoOfferPendingRef.current = false
    }
    if (!next) setStepIndex(0)
  }

  const finishTour = useCallback(() => {
    markAutoTourHandled()
    autoOfferPendingRef.current = false
    setOpen(false)
    setStepIndex(0)
  }, [])

  const sendQuestion = (raw: string) => {
    const q = raw.trim()
    if (!q) return
    setInput("")
    setMessages((m) => [...m, { role: "user", text: q }])
    const { title, body } = answerNestQuestion(q)
    setMessages((m) => [
      ...m,
      { role: "assistant", title, text: body },
    ])
  }

  const appendSuggestion = (entry: NestFaqEntry) => {
    setMessages((m) => [
      ...m,
      { role: "user", text: entry.title },
      { role: "assistant", title: entry.title, text: entry.answer },
    ])
  }

  const step = TUTORIAL_STEPS[stepIndex]!
  const StepIcon = step.Icon
  const isLast = stepIndex >= TUTORIAL_STEPS.length - 1

  return (
    <>
      <Button
        type="button"
        size="icon"
        className={cn(
          "fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full shadow-lg",
          "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
        aria-label="Open Nest help and tour"
        onClick={() => openAssistant("chat")}
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[min(90vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as NestAssistantTab)}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="border-b border-border px-4 pt-4 pb-2">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Nest help center
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Quick answers and a short animated walkthrough—no account required.
                </DialogDescription>
              </DialogHeader>
              <TabsList className="mt-3 w-full">
                <TabsTrigger value="chat" className="flex-1 gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Ask
                </TabsTrigger>
                <TabsTrigger value="tour" className="flex-1 gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Tour
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="chat"
              className="mt-0 flex min-h-[320px] flex-1 flex-col overflow-hidden px-4 pb-4 data-[state=inactive]:hidden"
            >
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto py-3">
                {messages.map((msg, i) => (
                  <div
                    key={`${i}-${msg.text.slice(0, 12)}`}
                    className={cn(
                      "animate-in fade-in slide-in-from-bottom-2 duration-300",
                      msg.role === "user"
                        ? "ml-6 rounded-2xl bg-primary/10 px-3 py-2 text-sm text-foreground"
                        : "mr-4 rounded-2xl border border-border/80 bg-muted/40 px-3 py-2 text-sm text-foreground"
                    )}
                  >
                    {msg.title && msg.role === "assistant" ? (
                      <p className="mb-1 font-semibold text-foreground">
                        {msg.title}
                      </p>
                    ) : null}
                    <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                      {msg.text}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Suggested
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {NEST_FAQ_ENTRIES.slice(0, 6).map((e) => (
                    <Button
                      key={e.id}
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-auto rounded-full px-2.5 py-1 text-xs font-normal"
                      onClick={() => appendSuggestion(e)}
                    >
                      {e.title}
                    </Button>
                  ))}
                </div>
                <form
                  className="flex gap-2"
                  onSubmit={(ev) => {
                    ev.preventDefault()
                    sendQuestion(input)
                  }}
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="e.g. How do gifts work?"
                    className="flex-1"
                    autoComplete="off"
                  />
                  <Button type="submit" size="icon" aria-label="Send">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </TabsContent>

            <TabsContent
              value="tour"
              className="mt-0 flex min-h-[360px] flex-1 flex-col px-4 pb-4 data-[state=inactive]:hidden"
            >
              <div
                key={stepIndex}
                className="animate-in fade-in zoom-in-95 slide-in-from-right-4 flex flex-1 flex-col duration-300"
              >
                <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6 text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-inner">
                    <StepIcon className="h-10 w-10" strokeWidth={1.5} />
                  </div>
                  <div className="space-y-2 px-1">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      Step {stepIndex + 1} of {TUTORIAL_STEPS.length}
                    </p>
                    <h3 className="text-xl font-semibold tracking-tight text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1.5 pb-1">
                  {TUTORIAL_STEPS.map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        i === stepIndex
                          ? "w-6 bg-primary"
                          : "w-1.5 bg-muted-foreground/25"
                      )}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      markAutoTourHandled()
                      autoOfferPendingRef.current = false
                      setOpen(false)
                    }}
                  >
                    Skip tour
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={stepIndex === 0}
                      onClick={() =>
                        setStepIndex((s) => Math.max(0, s - 1))
                      }
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        if (isLast) finishTour()
                        else setStepIndex((s) => s + 1)
                      }}
                    >
                      {isLast ? "Done" : "Next"}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}

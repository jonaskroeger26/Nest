"use client"

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"
import {
  Bird,
  Copy,
  HelpCircle,
  Lock,
  MessageCircle,
  RotateCcw,
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
  filterFaqEntries,
  type NestFaqEntry,
} from "@/lib/nest-help-faq"
import { toast } from "sonner"

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

type ChatMsg = {
  id: string
  role: "user" | "assistant"
  text: string
  title?: string
  confidence?: "high" | "medium" | "low"
  alternatives?: NestFaqEntry[]
  related?: NestFaqEntry[]
}

function formatLineWithBold(line: string): ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    const m = part.match(/^\*\*(.+)\*\*$/)
    if (m) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {m[1]}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function FormattedAssistantText({ text }: { text: string }) {
  const blocks = text.split(/\n\n/)
  return (
    <div className="space-y-2">
      {blocks.map((block, bi) => (
        <div key={bi} className="space-y-1">
          {block.split("\n").map((line, li) => (
            <p key={li} className="leading-relaxed text-muted-foreground">
              {formatLineWithBold(line)}
            </p>
          ))}
        </div>
      ))}
    </div>
  )
}

function TypingIndicator() {
  return (
    <div
      className="mr-4 flex items-center gap-1 rounded-2xl border border-border/80 bg-muted/40 px-4 py-3"
      aria-hidden
    >
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
    </div>
  )
}

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

let msgId = 0
function nextMsgId() {
  msgId += 1
  return `m-${msgId}-${Date.now()}`
}

const WELCOME_MESSAGES: ChatMsg[] = [
  {
    id: "welcome-1",
    role: "assistant",
    title: "Hi — I’m the Nest guide",
    text: "Ask in your own words, or tap a topic below. I use **keyword matching** on curated answers (no live AI), so short questions work best.\n\nTry: **gifts**, **testnet**, **auto-save**, or **vault vs wallet**.",
  },
]

export function NestAssistant() {
  const pathname = usePathname()
  const listRef = useRef<HTMLDivElement>(null)
  const inputId = useId()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<NestAssistantTab>("chat")
  const [stepIndex, setStepIndex] = useState(0)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<ChatMsg[]>(WELCOME_MESSAGES)
  const [isTyping, setIsTyping] = useState(false)
  const autoOfferPendingRef = useRef(false)
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const deferredInput = useDeferredValue(input)
  /** Topic chips only before the user sends or picks a topic; after that, chat only (+ Reset chat). */
  const showTopicBrowser = useMemo(
    () => !messages.some((m) => m.role === "user"),
    [messages]
  )
  const suggestedEntries = useMemo(() => {
    if (!showTopicBrowser) return []
    return filterFaqEntries(deferredInput, 14)
  }, [deferredInput, showTopicBrowser])

  const scrollToBottom = useCallback(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isTyping, scrollToBottom])

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

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    }
  }, [])

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

  const clearChat = useCallback(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = null
    setIsTyping(false)
    setMessages(WELCOME_MESSAGES.map((m) => ({ ...m, id: nextMsgId() })))
  }, [])

  const sendQuestion = (raw: string) => {
    const q = raw.trim()
    if (!q || isTyping) return
    setInput("")
    const userMsg: ChatMsg = { id: nextMsgId(), role: "user", text: q }
    setMessages((m) => [...m, userMsg])
    setIsTyping(true)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    const delay = 380 + Math.floor(Math.random() * 320)
    typingTimerRef.current = setTimeout(() => {
      const ans = answerNestQuestion(q)
      const assistantMsg: ChatMsg = {
        id: nextMsgId(),
        role: "assistant",
        title: ans.title,
        text: ans.body,
        confidence: ans.confidence,
        alternatives: ans.alternatives,
        related: ans.related,
      }
      setMessages((m) => [...m, assistantMsg])
      setIsTyping(false)
      typingTimerRef.current = null
    }, delay)
  }

  const appendSuggestion = (entry: NestFaqEntry) => {
    if (isTyping) return
    setMessages((m) => [
      ...m,
      { id: nextMsgId(), role: "user", text: entry.title },
      {
        id: nextMsgId(),
        role: "assistant",
        title: entry.title,
        text: entry.answer,
        confidence: "high",
        related: entry.relatedIds
          ?.map((id) => NEST_FAQ_ENTRIES.find((e) => e.id === id))
          .filter((e): e is NestFaqEntry => Boolean(e))
          .filter((e) => e.id !== entry.id)
          .slice(0, 4),
      },
    ])
  }

  const copyAnswer = async (text: string, title?: string) => {
    const block = title ? `${title}\n\n${text}` : text
    try {
      await navigator.clipboard.writeText(block.replace(/\*\*/g, ""))
      toast.success("Copied to clipboard")
    } catch {
      toast.error("Could not copy")
    }
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
        <DialogContent className="flex max-h-[min(92vh,680px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
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
                  Smart topic matching and curated answers. For a walkthrough, open
                  the Tour tab.
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
              className="mt-0 flex min-h-[340px] flex-1 flex-col overflow-hidden px-4 pb-4 data-[state=inactive]:hidden"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border/80 py-2">
                <p className="text-[11px] text-muted-foreground">
                  {NEST_FAQ_ENTRIES.length} topics · matches keywords & synonyms
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-xs text-muted-foreground"
                  onClick={clearChat}
                  disabled={isTyping}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset chat
                </Button>
              </div>

              <div
                ref={listRef}
                className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-3"
              >
                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-2">
                    <div
                      className={cn(
                        "animate-in fade-in slide-in-from-bottom-2 duration-300",
                        msg.role === "user"
                          ? "ml-5 rounded-2xl bg-primary/10 px-3 py-2.5 text-sm text-foreground"
                          : "mr-2 rounded-2xl border border-border/80 bg-muted/40 px-3 py-2.5 text-sm"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            {msg.title ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-foreground">
                                  {msg.title}
                                </p>
                                {msg.confidence ? (
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                                      msg.confidence === "high" &&
                                        "bg-primary/15 text-primary",
                                      msg.confidence === "medium" &&
                                        "bg-amber-500/15 text-amber-800 dark:text-amber-200",
                                      msg.confidence === "low" &&
                                        "bg-muted text-muted-foreground"
                                    )}
                                  >
                                    {msg.confidence} match
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground"
                            aria-label="Copy answer"
                            onClick={() => void copyAnswer(msg.text, msg.title)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : null}
                      {msg.role === "assistant" ? (
                        <FormattedAssistantText text={msg.text} />
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </p>
                      )}
                    </div>

                    {msg.role === "assistant" &&
                    msg.alternatives &&
                    msg.alternatives.length > 0 ? (
                      <div className="mr-2 space-y-1.5 pl-1">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          You might mean
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.alternatives.map((e) => (
                            <Button
                              key={e.id}
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-auto rounded-full px-2.5 py-1 text-xs font-normal"
                              disabled={isTyping}
                              onClick={() => appendSuggestion(e)}
                            >
                              {e.title}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {msg.role === "assistant" &&
                    msg.related &&
                    msg.related.length > 0 ? (
                      <div className="mr-2 space-y-1.5 pl-1">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          Related
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.related.map((e) => (
                            <Button
                              key={e.id}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-auto rounded-full border-dashed px-2.5 py-1 text-xs font-normal"
                              disabled={isTyping}
                              onClick={() => appendSuggestion(e)}
                            >
                              {e.title}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
                {isTyping ? <TypingIndicator /> : null}
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                {showTopicBrowser ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {deferredInput.trim()
                          ? "Matching topics"
                          : "Browse topics"}
                      </p>
                      {deferredInput.trim() ? (
                        <button
                          type="button"
                          className="text-[11px] text-primary hover:underline"
                          onClick={() => setInput("")}
                        >
                          Clear filter
                        </button>
                      ) : null}
                    </div>
                    <div className="flex max-h-[72px] flex-wrap gap-1.5 overflow-y-auto pr-0.5">
                      {suggestedEntries.map((e) => (
                        <Button
                          key={e.id}
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="h-auto max-w-full truncate rounded-full px-2.5 py-1 text-xs font-normal"
                          disabled={isTyping}
                          title={`${e.category}: ${e.title}`}
                          onClick={() => appendSuggestion(e)}
                        >
                          {e.title}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Use <span className="font-medium text-foreground">Reset chat</span>{" "}
                    above to see topic suggestions again.
                  </p>
                )}
                <form
                  className="flex gap-2"
                  onSubmit={(ev) => {
                    ev.preventDefault()
                    sendQuestion(input)
                  }}
                >
                  <label htmlFor={inputId} className="sr-only">
                    Ask a question
                  </label>
                  <Input
                    id={inputId}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      showTopicBrowser
                        ? "Type to filter topics, or ask a question…"
                        : "Ask a follow-up…"
                    }
                    className="flex-1"
                    autoComplete="off"
                    disabled={isTyping}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    aria-label="Send"
                    disabled={isTyping || !input.trim()}
                  >
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
                      onClick={() => setStepIndex((s) => Math.max(0, s - 1))}
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

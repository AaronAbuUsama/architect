import { CalendarCheckIcon, SlackLogoIcon, TelegramLogoIcon, TerminalWindowIcon, WebhooksLogoIcon } from "@phosphor-icons/react/ssr";

const icons = { Slack: SlackLogoIcon, Telegram: TelegramLogoIcon, Webhook: WebhooksLogoIcon, Console: TerminalWindowIcon, Schedule: CalendarCheckIcon };

export const ChannelIcon = ({ kind }: { kind: string }) => {
  const Icon = icons[kind as keyof typeof icons] ?? TerminalWindowIcon;
  return <span className={`chan-icon chan-icon--${kind.toLowerCase()}`} aria-hidden="true"><Icon size={16} weight="bold" /></span>;
};

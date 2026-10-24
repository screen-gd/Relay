import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import {
  Notification01Icon,
  LibraryIcon,
  ArrowDown01Icon,
  ArrowRight01Icon,
  Comment01Icon,
  CheckmarkSquare02Icon,
  CreditCardIcon as CreditCardGlyph,
  MoreHorizontalIcon,
  File02Icon,
  Image02Icon,
  Folder02Icon,
  Search01Icon,
  PencilEdit02Icon,
  Add01Icon,
  HelpCircleIcon,
  SidebarLeft01Icon,
  CloudIcon,
  Home01Icon,
  UserGroupIcon,
  UserMultipleIcon,
  BubbleChatIcon,
} from "@hugeicons/core-free-icons";
import type { SVGProps } from "react";

type Props = Omit<SVGProps<SVGSVGElement>, "ref" | "strokeWidth"> & {
  size?: number;
  strokeWidth?: number;
};

/** The same glyphs and stroke weight used by the running Relay workspace. */
function icon(glyph: IconSvgElement) {
  return function AppIcon({ size = 16, strokeWidth = 1.75, ...props }: Props) {
    return (
      <HugeiconsIcon
        icon={glyph}
        size={size}
        strokeWidth={strokeWidth}
        aria-hidden="true"
        {...props}
      />
    );
  };
}

export const BellIcon = icon(Notification01Icon);
export const BookOpenIcon = icon(LibraryIcon);
export const CaretDownIcon = icon(ArrowDown01Icon);
export const CaretRightIcon = icon(ArrowRight01Icon);
export const ChatCircleIcon = icon(Comment01Icon);
export const CheckSquareIcon = icon(CheckmarkSquare02Icon);
export const CreditCardIcon = icon(CreditCardGlyph);
export const DotsThreeIcon = icon(MoreHorizontalIcon);
export const FileTextIcon = icon(File02Icon);
export const ImagesIcon = icon(Image02Icon);
export const KanbanIcon = icon(Folder02Icon);
export const MagnifyingGlassIcon = icon(Search01Icon);
export const NotePencilIcon = icon(PencilEdit02Icon);
export const PlusIcon = icon(Add01Icon);
export const QuestionIcon = icon(HelpCircleIcon);
export const SidebarSimpleIcon = icon(SidebarLeft01Icon);
export const SparkleIcon = icon(CloudIcon);
export const SquaresFourIcon = icon(Home01Icon);
export const UsersIcon = icon(UserGroupIcon);
export const UsersThreeIcon = icon(UserMultipleIcon);
export const TeamChatIcon = icon(BubbleChatIcon);

import {
  Briefcase,
  MonitorOff,
  Users,
  Utensils,
  Wallet,
  BookOpen,
  UserCheck,
  MoreHorizontal
} from "lucide-react";

export const CATEGORIES = [
  "العمل / اجتماعات",
  "رقمي / تركيز",
  "اجتماعي / عائلي",
  "صحّة / طعام",
  "ماليّ",
  "تعلّم / بحث",
  "التزام شخصي",
  "أخرى"
];

export const getCategoryIcon = (cat: string) => {
  switch (cat) {
    case "العمل / اجتماعات": return Briefcase;
    case "رقمي / تركيز": return MonitorOff;
    case "اجتماعي / عائلي": return Users;
    case "صحّة / طعام": return Utensils;
    case "ماليّ": return Wallet;
    case "تعلّم / بحث": return BookOpen;
    case "التزام شخصي": return UserCheck;
    default: return MoreHorizontal;
  }
};

export const OUTCOMES = [
  { value: "Held", label: "صمدت", color: "text-green-700 bg-green-100 border-green-200" },
  { value: "Partial", label: "جزئي", color: "text-yellow-700 bg-yellow-100 border-yellow-200" },
  { value: "Caved", label: "تراجعت", color: "text-red-700 bg-red-100 border-red-200" }
];

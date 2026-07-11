import React from "react";
import * as Icons from "lucide-react";

interface CategoryIconProps {
  name: string;
  className?: string;
}

export default function CategoryIcon({ name, className = "w-5 h-5" }: CategoryIconProps) {
  // Map standard categories to Lucide Icons
  let IconComponent = Icons.HelpCircle;

  if (name.includes("อาหาร") || name.includes("เครื่องดื่ม")) {
    IconComponent = Icons.Utensils;
  } else if (name.includes("เดินทาง") || name.includes("รถ")) {
    IconComponent = Icons.Car;
  } else if (name.includes("ช้อปปิ้ง") || name.includes("ซื้อของ")) {
    IconComponent = Icons.ShoppingBag;
  } else if (name.includes("ที่อยู่อาศัย") || name.includes("ไฟ") || name.includes("บ้าน")) {
    IconComponent = Icons.Home;
  } else if (name.includes("ความบันเทิง") || name.includes("หนัง") || name.includes("เกม")) {
    IconComponent = Icons.Film;
  } else if (name.includes("สุขภาพ") || name.includes("ยา") || name.includes("แพทย์")) {
    IconComponent = Icons.HeartPulse;
  } else if (name.includes("การศึกษา") || name.includes("เรียน") || name.includes("หนังสือ")) {
    IconComponent = Icons.GraduationCap;
  } else if (name.includes("เงินเดือน") || name.includes("จ้าง")) {
    IconComponent = Icons.Briefcase;
  } else if (name.includes("ธุรกิจ") || name.includes("ค้า")) {
    IconComponent = Icons.TrendingUp;
  } else if (name.includes("ลงทุน") || name.includes("หุ้น")) {
    IconComponent = Icons.Coins;
  } else if (name.includes("ช่วยเหลือ") || name.includes("ของขวัญ")) {
    IconComponent = Icons.Gift;
  } else if (name.includes("รายรับ") || name.includes("บวก")) {
    IconComponent = Icons.PlusCircle;
  } else if (name.includes("เบ็ดเตล็ด") || name.includes("อื่นๆ") || name.includes("ทั่วไป")) {
    IconComponent = Icons.FileText;
  }

  return <IconComponent className={className} />;
}

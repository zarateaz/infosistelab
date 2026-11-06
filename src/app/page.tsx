import { HomeExperience } from "@/components/HomeExperience";
import { StoreShowcase } from "@/components/sections/StoreShowcase";

export default function Home() {
  return <HomeExperience storeShowcase={<StoreShowcase />} />;
}

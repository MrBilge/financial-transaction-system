import type { Metadata } from "next";

import { Content } from "./Content";

export const metadata: Metadata = {
  title: "Genel Bakış",
};

const DashboardPage = () => {
  return <Content />;
};

export default DashboardPage;

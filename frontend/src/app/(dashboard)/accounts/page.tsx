import type { Metadata } from "next";

import { PageBreadcrumb } from "@/components/PageBreadcrumb";

import { Content } from "./Content";

export const metadata: Metadata = {
  title: "Hesaplar",
};

const AccountsPage = () => {
  return (
    <>
      <PageBreadcrumb
        items={[{ label: "Genel Bakış", href: "/" }, { label: "Hesaplar" }]}
      />
      <Content />
    </>
  );
};

export default AccountsPage;

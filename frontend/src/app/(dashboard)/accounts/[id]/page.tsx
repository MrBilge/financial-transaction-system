import type { Metadata } from "next";

import { PageBreadcrumb } from "@/components/PageBreadcrumb";

import { Content } from "./Content";

export const metadata: Metadata = {
  title: "Hesap Detayı",
};

// Hesap ID'si Content içinde useParams ile okunur; veriler tarayıcıda
// oturum token'ı ile yüklendiği için sayfa sunucuda veri çekmez.
const AccountDetailPage = () => {
  return (
    <>
      <PageBreadcrumb
        items={[
          { label: "Genel Bakış", href: "/" },
          { label: "Hesaplar", href: "/accounts" },
          { label: "Hesap Detayı" },
        ]}
      />
      <Content />
    </>
  );
};

export default AccountDetailPage;

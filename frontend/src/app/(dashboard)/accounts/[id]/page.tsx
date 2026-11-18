import type { Metadata } from "next";

import { Content } from "./Content";

export const metadata: Metadata = {
  title: "Hesap Detayı",
};

// Hesap ID'si Content içinde useParams ile okunur; veriler tarayıcıda
// oturum token'ı ile yüklendiği için sayfa sunucuda veri çekmez.
const AccountDetailPage = () => {
  return <Content />;
};

export default AccountDetailPage;

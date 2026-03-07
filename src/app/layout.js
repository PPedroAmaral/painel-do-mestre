import "./globals.css"; 
export const metadata = {
  title: "Painel do Mestre",
  description: "Gerenciador de campanhas RPG",
};

export default function RootLayout({ children }) {
  return (
    // Lembre-se de não colocar a classe 'dark' direto aqui, senão trava no modo escuro
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
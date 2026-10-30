const links = [
  { href: "/", label: "Activity" },
  { href: "/unsolved", label: "Unsolved" },
  { href: "/halim-book", label: "Halim Book" },
  { href: "/youkn0wwho", label: "YouKn0wWho" },
  { href: "/atcoder-topicwise", label: "AtCoder" },
];

export default function Nav({ current }: { current: string }) {
  return (
    <nav aria-label="Pages" className="mb-4 flex flex-wrap gap-1 text-sm">
      {links.map((link) => {
        const active = link.href === current;
        return (
          <a
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-2.5 py-1 transition ${
              active ? "bg-white/10 text-white" : "text-neutral-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {link.label}
          </a>
        );
      })}
    </nav>
  );
}

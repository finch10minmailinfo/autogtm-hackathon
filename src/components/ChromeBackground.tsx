/**
 * Fixed background: the bg.jpg photo (dark light-streak abstract) blown up and
 * heavily blurred so it reads as a soft moody color wash behind the glass UI.
 * Non-interactive, z-index -1, fixed (does not scroll).
 */
export function ChromeBackground() {
  return (
    <div className="lex-bg" aria-hidden>
      <div
        style={{
          position: "absolute",
          inset: "-8%",
          backgroundImage: "url(/bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(60px) saturate(115%)",
          transform: "scale(1.15)",
        }}
      />
      {/* slight darken so the frosted card edges pop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(75% 60% at 50% 45%, rgba(0,0,0,0.10), rgba(0,0,0,0.32))",
        }}
      />
    </div>
  );
}

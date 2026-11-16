/**
 * Page backdrop that matches the devChallenges "Code Sharing App" design:
 * a near-white page, two faint arcs, a purple "valley" at the bottom that
 * rises up on both sides of the editor card, plus floating sparkles/avatars.
 *
 * Coordinates below were measured from the 1280px desktop design, so the
 * decorations only render from the `xl` breakpoint up.
 */

const PAGE_BG = '#FCFCFF';

function Sparkle({
  color,
  size,
  left,
  top,
}: {
  color: string;
  size: number;
  left: number;
  top: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className="absolute"
      style={{ left, top }}
      fill={color}
    >
      <path d="M12 0C12 7 17 12 24 12C17 12 12 17 12 24C12 17 7 12 0 12C7 12 12 7 12 0Z" />
    </svg>
  );
}

function Avatar({
  emoji,
  bg,
  size,
  left,
  top,
}: {
  emoji: string;
  bg: string;
  size: number;
  left: number;
  top: number;
}) {
  return (
    <div
      className="absolute rounded-full flex items-center justify-center ring-2 ring-white shadow-sm"
      style={{
        left,
        top,
        width: size,
        height: size,
        backgroundColor: bg,
        fontSize: size * 0.55,
        lineHeight: 1,
      }}
    >
      {emoji}
    </div>
  );
}

export function PageBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ backgroundColor: PAGE_BG }}
    >
      {/* Purple base layer (sits under the page-coloured ellipse below) */}
      <div className="absolute inset-x-0 top-[300px] bottom-0 bg-gradient-to-r from-[#AA77F1] to-[#7C48E3]" />

      {/* Big page-coloured ellipse: carves the curved top edge of the purple area */}
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-[50%] w-[1200px] h-[700px] -top-[180px] md:w-[2200px] md:h-[1484px] md:-top-[752px]"
        style={{ backgroundColor: PAGE_BG }}
      />

      {/* Two faint decorative arcs */}
      <svg
        className="absolute inset-x-0 top-0 hidden md:block w-full h-[560px]"
        viewBox="0 0 1280 560"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 101 Q640 369 1280 101"
          stroke="#E6E8F0"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M0 354 Q640 540 1280 354"
          stroke="#E6E8F0"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Floating sparkles + avatars (desktop only) */}
      <div className="absolute inset-x-0 top-0 hidden xl:block">
        <div className="relative mx-auto w-[1280px] h-[600px]">
          <Sparkle color="#FFB84D" size={16} left={320} top={114} />
          <Sparkle color="#4C8DFF" size={28} left={134} top={206} />
          <Sparkle color="#86C46A" size={20} left={1120} top={159} />
          <Sparkle color="#8B5CF6" size={16} left={1173} top={520} />

          <Avatar emoji="👩‍💻" bg="#E9D5FF" size={26} left={966} top={86} />
          <Avatar emoji="🤓" bg="#BFE3F5" size={40} left={73} top={316} />
          <Avatar emoji="🤠" bg="#E2E2E2" size={40} left={1192} top={249} />
        </div>
      </div>
    </div>
  );
}

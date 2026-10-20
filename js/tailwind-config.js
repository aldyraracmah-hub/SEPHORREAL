tailwind.config = {
  theme: {
    screens: { sm: "521px", lg: "901px", xl: "1101px" },
    extend: {
      colors: {
        black: "#0a0a0a",
        line: "#e2e2e2",
        gray: {
          50: "#f6f6f6",
          100: "#ececec",
          300: "#c9c9c9",
          500: "#7a7a7a",
          700: "#3a3a3a",
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Helvetica Neue"', "Arial", "sans-serif"],
        body: ['"Inter"', '"Helvetica Neue"', "Arial", "sans-serif"],
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(.2, .7, .2, 1)",
      },
      keyframes: {
        marquee: { to: { transform: "translateX(-50%)" } },
      },
      animation: {
        marquee: "marquee 28s linear infinite",
      },
    },
  },
};

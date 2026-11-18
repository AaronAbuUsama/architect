# Spike trial: the trace waterfall in Manim, to compare with the SVG + Playwright route. Not used by the docs.
from manim import *

SPANS = [
    ("allowance.spend", 0.0, 1.0, "#7aa2f7"),
    ("allowance.spend.load", 0.08, 0.30, "#9ece6a"),
    ("allowance.spend.record", 0.34, 0.80, "#9ece6a"),
    ("commit", 0.84, 0.97, "#e0af68"),
]

class Waterfall(Scene):
    def construct(self):
        self.camera.background_color = "#16161e"
        left, width = -3.0, 8.0
        for i, (name, start, end, color) in enumerate(SPANS):
            y = 2 - i * 1.0
            label = Text(name, font="Menlo", font_size=22, color="#c0caf5").move_to([-5.2, y, 0])
            bar = Rectangle(width=(end - start) * width, height=0.45, fill_color=color, fill_opacity=1, stroke_width=0)
            bar.move_to([left + (start + end) / 2 * width, y, 0])
            self.play(FadeIn(label, shift=RIGHT * 0.2), GrowFromEdge(bar, LEFT), run_time=0.6)
        self.wait(1)

import AppHeader from "@/components/AppHeader";

export const metadata = {
  title: "About | AB3 Soccer Activity Library",
};

const sectionHeadingClass =
  "mt-10 text-2xl font-black leading-tight text-[#0d2140] sm:text-3xl";

const paragraphClass =
  "mt-5 text-base leading-8 text-slate-700 sm:text-lg sm:leading-9";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="relative overflow-hidden px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[url('/login-background.png')] bg-[length:100%_auto] bg-top bg-repeat-y opacity-65"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-slate-100/35"
        />

        <article className="relative z-10 mx-auto w-full max-w-5xl rounded-[28px] bg-white/95 px-6 py-8 shadow-2xl ring-1 ring-slate-200/80 backdrop-blur-sm sm:px-10 sm:py-12 lg:px-14 lg:py-16">
          <div className="mx-auto max-w-3xl">
            <p className="text-base leading-8 text-slate-700 sm:text-lg sm:leading-9">
              Coaches spend a lot of time talking about expectations.
              <br />
              What we expect from players.
              <br />
              What we expect at practice.
              <br />
              What we expect on game day.
              <br />
              What we expect from parents on the sideline.
            </p>

            <p className={paragraphClass}>
              And I think that’s important. Expectations matter, and they should
              be clear early.
            </p>

            <p className={paragraphClass}>
              But I’ve been thinking a lot lately about the other side of that
              conversation: what should players and parents expect from me as a
              coach?
            </p>

            <p className={paragraphClass}>
              Not just tactically. Not just in terms of practices, games,
              formations, or playing time. But as a leader, teacher,
              communicator, and adult in their lives.
            </p>

            <p className={paragraphClass}>
              When I mailed out summer packets to next season’s players, I
              included something I wanted every player and parent to have from
              the beginning.
            </p>

            <div className="my-10 border-y border-slate-200 py-8">
              <p className="text-lg font-semibold leading-8 text-[#0d2140] sm:text-xl">
                To My Players &amp; Their Parents,
              </p>

              <p className={paragraphClass}>
                My players already know how much I like to talk, so hopefully no
                one is too surprised by all these words. I know it’s a lot,
                maybe they can count this toward their summer reading?
              </p>

              <p className={paragraphClass}>
                I really believe sports play a huge role in shaping kids. The
                game itself matters, but what happens around the game matters
                even more. It’s how they deal with adversity, how they treat
                others, how they respond when things are hard, and whether they
                find the confidence to speak up or stay quiet.
              </p>

              <p className={paragraphClass}>
                I know the way I coach, the words I choose, and the environment
                I create can stick with a player long after a practice or game
                is over. That’s a big responsibility. Because of that, I’m very
                intentional about the kind of coach I try to show up as every
                day.
              </p>

              <h2 className={sectionHeadingClass}>
                Understanding group dynamics
              </h2>

              <p className={paragraphClass}>
                I don’t see a team as just a group of individuals wearing the
                same jersey. It’s a system, and how I lead within that system
                matters.
              </p>

              <p className={paragraphClass}>
                I think about how I handle the star player, the one everyone
                defers to. I also think about how I treat the player doing the
                unglamorous work, the one who may never score but consistently
                wins the ball back. I hold myself to being consistent. The
                standard applies to everyone.
              </p>

              <p className={paragraphClass}>
                I make it a point to reinforce one thing every day: every role
                on the pitch matters. Not as a slogan, but as a standard.
                Goalkeeper, midfielders, defenders, forwards — we’re not a
                hierarchy. We’re a system.
              </p>

              <p className={paragraphClass}>
                I’ve seen how easy it is for players to gravitate toward
                attacking roles. Scoring goals is fun. But I’m intentional about
                recognizing defending just as much: a well-timed tackle, a
                recovery run, a smart decision to delay, a strong team shape
                that prevents a goal, a great save by the keeper. Those moments
                matter just as much.
              </p>

              <h2 className={sectionHeadingClass}>
                Leadership, not just authority
              </h2>

              <p className={paragraphClass}>
                I don’t want to just tell players what to do. I want to lead
                them. For me, leadership is about example. Showing up prepared,
                working hard, treating people the right way, and setting a
                standard without always having to say it.
              </p>

              <p className={paragraphClass}>
                I try to be intentional about setting expectations early. The
                standards are clear, and some things are non-negotiable: focus
                and intensity at both games and practices, and respect for
                teammates. The goal is to build an environment where players
                understand what we stand for without constant correction.
              </p>

              <p className={paragraphClass}>
                If I’m constantly having to rely on authority, I know I’ve
                missed the mark.
              </p>

              <h2 className={sectionHeadingClass}>The ability to teach</h2>

              <p className={paragraphClass}>
                Wanting to teach isn’t the same as being able to teach. That’s
                something I remind myself of often.
              </p>

              <p className={paragraphClass}>
                If something isn’t clicking for a player, I don’t move past it.
                I come back to it, and if needed, I find a different way to
                explain it. That adjustment is on me. Repetition isn’t a
                setback. It’s part of how players learn.
              </p>

              <p className={paragraphClass}>
                I also recognize that players take in information differently.
                Some can process a lot at once, others need things broken down.
                It’s my responsibility to meet them where they are. There’s more
                than one way to get to the same outcome. My job is to help each
                player find the way that works for them.
              </p>

              <h2 className={sectionHeadingClass}>Analytical thinking</h2>

              <p className={paragraphClass}>
                When I review game film, I’m not just watching it back. I’m
                studying it. What are we doing well? Where are we improving?
                Where are we getting stuck?
              </p>

              <p className={paragraphClass}>
                I like to measure things so progress is real, not just a feeling.
                But more than anything, I want players competing against
                themselves. Can you be better than you were last practice or
                game? Can you make a better decision, execute something cleaner,
                recognize something quicker? That’s the standard I care about:
                not perfection, and not improvement every single week, but
                steady growth over time.
              </p>

              <h2 className={sectionHeadingClass}>
                A plan, and the discipline to follow it
              </h2>

              <p className={paragraphClass}>
                I like going into a season with a plan and direction.
              </p>

              <p className={paragraphClass}>
                What are we actually trying to build? What does improvement look
                like for this group? What are we moving toward each week?
              </p>

              <p className={paragraphClass}>
                When things don’t go our way, I try not to overreact. I go back
                to the plan. I’ll adjust when needed, but I want those
                adjustments to have a purpose behind them, not just be a
                reaction to one tough game or one frustrating result.
              </p>

              <p className={paragraphClass}>
                I also have to remind myself that development isn’t a straight
                line. That’s easy to lose sight of when games are being played
                and the results are right there in front of me. I still struggle
                with that. I can definitely be cranky after a tough loss.
                Thankfully, I have an incredible wife who reminds me that growth
                doesn’t always show up on the scoreboard - the steady yin to my
                chaotic yang.
              </p>

              <h2 className={sectionHeadingClass}>Practice “Freeze”</h2>

              <p className={paragraphClass}>
                I see the game as connected, not a series of isolated moments.
                What does this decision lead to? How does where you are on the
                field change what’s available next? I want players thinking
                ahead, not just focused on the ball in front of them.
              </p>

              <p className={paragraphClass}>
                When a mistake happens in practice and I “freeze” the moment,
                it’s not about blame. It’s about understanding. I want players
                to see the game, not just play it. I’ll ask questions, replay
                the situation, and walk through it with them. The goal is for
                them to read the game, not just react to it.
              </p>

              <p className={paragraphClass}>
                One of my favorite coaches, Jürgen Klopp, was once asked what
                youth coaches should do better in the development process. The
                interviewer was clearly looking for an answer like “more time on
                working on technique” or “more time teaching tactics,” etc. But
                his answer was, “Getting players to believe in themselves. Any
                coach can teach dribbling or how to strike a ball. But can you
                correct a player while also making that player believe they can
                get better? Can you help them feel like they are improving,
                even while you’re pointing out what still needs work?”
              </p>

              <p className={paragraphClass}>That really sticks with me.</p>

              <p className={paragraphClass}>
                There are definitely times when I can focus a little too much
                on what needs to be improved. But I’m a firm believer that you
                have to celebrate improvement as it’s happening. Players need
                correction, but they also need positive reinforcement. They need
                to know that their work is showing up, that they are getting
                better, and that people notice.
              </p>

              <h2 className={sectionHeadingClass}>Empathy</h2>

              <p className={paragraphClass}>
                Every player is different, and each one experiences the game a
                little differently.
              </p>

              <p className={paragraphClass}>
                I try to be mindful that the same feedback can land completely
                differently depending on the player. I celebrate success with
                real excitement, and when things don’t go well, I try to sit
                with players in that moment instead of rushing to fix it.
              </p>

              <p className={paragraphClass}>
                I think back to one of my early U10 boys games
                a few years back. One of our players was in goal for the first
                time. It didn’t go well. After the game, he was fighting back
                tears. I told him I was proud of him for stepping up for the
                team. He worked hard &amp; he did his best (he is still a
                goalkeeper, by the way).
              </p>

              <p className={paragraphClass}>
                Empathy isn’t softness. It’s awareness. It’s recognizing that
                what looks small from the outside can feel big to the player in
                that moment.
              </p>

              <h2 className={sectionHeadingClass}>Fun</h2>

              <p className={paragraphClass}>
                I also try to remember that this is all supposed to be fun.
              </p>

              <p className={paragraphClass}>
                That doesn’t mean everything is easy or that we avoid hard work.
                It doesn’t mean losses don’t matter or that players shouldn’t
                care. But even in the worst losses, I try to find some kind of
                silver lining — something we learned, something we improved,
                something we can build from, or even just a reminder that we
                still get to do this together.
              </p>

              <p className={paragraphClass}>
                Because if the experience stops being fun, eventually none of
                the rest of this really matters. Players can love the game, but
                if the environment takes the joy out of it, they’ll eventually
                leave the game. I never want that. I want players to compete, be
                pushed, be held accountable, and still walk away feeling like
                soccer is something they love and it’s fun.
              </p>

              <h2 className={sectionHeadingClass}>Humility</h2>

              <p className={paragraphClass}>
                I am not perfect. And I don’t pretend to be. I will make
                mistakes. I will misread situations. I will say things I wish I
                could take back. When that happens, I try to own it. Sometimes
                one-on-one, sometimes in front of the team.
              </p>

              <p className={paragraphClass}>
                Because when I say, “I got that wrong,” I’m teaching something
                bigger than the game. I’m teaching accountability, reflection,
                and honesty.
              </p>

              <p className={paragraphClass}>
                And I mean this sincerely: if you (player or parent) ever feel
                like I’m not living up to any of this, I want you to let me
                know. That doesn’t mean I’ll always get everything right, and it
                doesn’t mean every decision will be easy. But I never want
                players or parents to feel like they can’t have an honest
                conversation with me.
              </p>

              <p className="mt-10 text-xl font-black leading-8 text-[#0d2140] sm:text-2xl">
                That’s what you can expect from me.
              </p>

              <p className="mt-4 text-xl font-black leading-8 text-[#0d2140] sm:text-2xl">
                Not perfection. But honest, thoughtful, and always growing.
              </p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

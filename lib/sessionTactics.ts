export const tactics: Record<string, Record<string, string[]>> = {
  'Attacking': {
    'Create Attacking Shape': ['Create appropriate height, width, depth','Create optimal attacking distances between players'],
    'Provide Options to Play Forward': ['Provide vertical or diagonal passing options','Overload centrally or wide','Move or lose opponent when marked','Make runs behind the defensive line','Give immediate support to teammate under pressure'],
    'Break Lines to Advance Attack': ['Drive with the ball to exploit space','Engage opponent: create 1v1 or 2v1','Find a free player between or behind the lines','Switch play: pass the ball to opponent’s weak zone'],
    'Take Countermeasures: Anticipate Opponent Counter': ['Push up the defensive line with speed: stay connected and compact'],
    'Finish the Attack as Fast as Possible': ['Separate: time run or quick movement to unmark','Final pass: through ball or combination play','Numbers in the box: fill zones in front of goal','Cross: into space or player','Take on 1v1 to create or score','Finish: use limited touches'],
  },
  'Attacking to Defending Transition': {
    'Apply Immediate Pressure on the Ball': ['Press to regain or prevent progress of the ball','Provide cover and balance: eliminate options'],
    'Delay the Counterattack': ['Drop off and block direct path to goal','Slow down and dictate opponent'],
    'Recover with Speed': ['Get numbers back quickly and take defensive position','Press from behind as quickly as possible'],
    'Take Countermeasures: Anticipate the Counter': ['Create passing option(s): between the lines'],
    'Deny Finish from Counterattack': ['Defend the goal and create conditions to engage','Challenge to protect against a goal attempt'],
  },
  'Defending': {
    'Create Defending Shape': ['Make team compact: vertical and horizontal','Create optimal defending distances between players'],
    'Build Pressure on the Ball': ['Move as a collective unit: make play predictable','Initiate pressure on the opponent with the ball','Engage when chance of regaining the ball','Provide cover and balance: eliminate passing options','Prevent the switch: keep opponent on one side'],
    'Recover When Pressure Is Broken': ['Immediately (re-) apply pressure on the ball','Delay attack and regain defensive shape','Look to intercept pass or win second ball'],
    'Take Countermeasures: Anticipate to Counter': ['Create passing option(s): between the lines'],
    'Deny the Finish': ['Get narrow and close the center: denying the through ball','Marking and tracking opponent','Deny the cross','Defending the cross: protect the width of the goal','Challenge to protect against goal attempt'],
  },
  'Defending to Attacking Transition': {
    'Play Forward Quickly': ['First action forward','Continue to play forward'],
    'Secure the Ball': ['Play out of pressure','Keep the ball: initiate build up'],
    'Join the Attack with Speed': ['Provide support in front of the ball','Provide support behind the ball'],
    'Take Countermeasures: Anticipate the Counter': ['Push up the defensive line with speed: stay connected and compact'],
    'Finish the Counterattack as Fast as Possible': ['Create and exploit space for self or teammate','Attack space or engage opponent','Recognize player in a better position to score','Finish: use limited touches'],
  },
};
export const gamePhases = Object.keys(tactics);
export type SessionVisibility = 'private' | 'club' | 'everyone';
export const visibilityLabels: Record<SessionVisibility, string> = { private: 'Private', club: 'My Club', everyone: 'Everyone' };
export type SessionDetails = { visibility: SessionVisibility; objective: string; gamePhase: string; principles: string[]; subprinciples: string[] };
export const emptySessionDetails = (): SessionDetails => ({ visibility: 'private', objective: '', gamePhase: '', principles: [], subprinciples: [] });
export function principleOptions(phase: string) { return Object.keys(tactics[phase] ?? {}); }
export function subprincipleOptions(phase: string, principles: string[]) { return [...new Set(principles.flatMap(p => tactics[phase]?.[p] ?? []))]; }
export function normalizeSessionDetails(value: Partial<SessionDetails> = {}): SessionDetails {
  const gamePhase = gamePhases.includes(value.gamePhase ?? '') ? value.gamePhase! : '';
  const principles = principleOptions(gamePhase).filter(p => value.principles?.includes(p));
  const subprinciples = subprincipleOptions(gamePhase, principles).filter(s => value.subprinciples?.includes(s));
  const visibility = value.visibility === 'club' || value.visibility === 'everyone' ? value.visibility : 'private';
  return { visibility, objective: value.objective ?? '', gamePhase, principles, subprinciples };
}

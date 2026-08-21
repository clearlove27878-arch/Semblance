export default function FinalReconstruction() {
  const timeline = [
    '程岚进入周枫家，发现蛇符异常并拆掉许玲的危险机关。',
    '她转向磁带，正常处理目标带时右拇指受伤，蛇毒由此进入。',
    '她察觉身体异常，寻找抗毒资源，却发现资源已经缺失。',
    '她离开屋子求救，蛇毒作用加重，最终在野道坠落。',
    '许玲真的想杀她，但没有杀成；周枫完成了第二条致死链。',
    '长期清洗和旧带磨损使关键痕迹无法形成完整定罪链。'
  ];
  return <article className="final-sheet"><p className="eyebrow">CASE RECONSTRUCTED</p><h1>没有人告诉她</h1><div className="final-lines"><div>许玲真的想杀她。</div><div>但许玲没有杀成。</div><div>周枫真的杀了她。</div><div>但程岚自己完成了最后一步解释。</div></div><h2>她一直在替别人把故事说完。</h2><div className="final-timeline">{timeline.map((line) => <div key={line}>{line}</div>)}</div><p className="small-note">案件重构完成。正式阶段状态与证据回读已保存。</p></article>;
}

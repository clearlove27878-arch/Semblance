export const CONTENT_MANIFEST = {
  files: {
    '案件文本/01_序_网页版.txt': { id: 'prologue', type: 'prologue', category: '序章' },
    '案件文本/02_死亡现场.txt': { id: 'death-scene', type: 'case_clue', category: '案件线索' },
    '案件文本/03_法医鉴定.txt': { id: 'forensic-report', type: 'case_clue', category: '案件线索' },
    '案件文本/04_右拇指创口.txt': { id: 'body-injuries', type: 'case_clue', category: '案件线索', relationObjectId: 'LAN_THUMB_WOUND' },
    '案件文本/05_枫家整体环境.txt': { id: 'feng-home', type: 'case_clue', category: '案件线索' },
    '案件文本/06_治疗镜.txt': { id: 'treatment-mirror', type: 'case_clue', category: '案件线索' },
    '案件文本/07_蛇柜.txt': { id: 'snake-cabinet', type: 'case_clue', category: '案件线索' },
    '案件文本/08_新蛇符.txt': { id: 'snake-charm', type: 'case_clue', category: '案件线索', relationObjectId: 'NEW_TALISMAN' },
    '案件文本/09_磁带箱.txt': { id: 'tapes-initial', type: 'case_clue', category: '案件线索' },
    '案件文本/10_旧收录机与手动回卷.txt': { id: 'old-recorder-rewind', type: 'case_clue', category: '案件线索', relationObjectId: 'OLD_RECORDER_REWIND' },
    '案件文本/11_案发日抗毒资源.txt': { id: 'antivenom-initial', type: 'case_clue', category: '案件线索' },
    '案件文本/12_枫的手伤.txt': { id: 'feng-hand-injury', type: 'case_clue', category: '案件线索' },
    '案件文本/13_录音.txt': { id: 'recording-old-treatment', type: 'recording', category: '录音', relationObjectId: 'OLD_TREATMENT_INTERPRETATION' },

    // Keep the formal source title/body unchanged; this is the player-facing
    // display normalization required for the current XU_LING label.
    '警方已知文本/P01_玲_警方已知.txt': {
      id: 'statement-ling',
      type: 'police_clue',
      category: '警方已知',
      relationObjectId: 'XU_LING',
      playerDisplayTitle: '玲｜警方已知'
    },
    '警方已知文本/P02_枫_警方已知.txt': { id: 'statement-feng', type: 'police_clue', category: '警方已知', relationObjectId: 'ZHOU_FENG' },
    '警方已知文本/P03_峥_警方已知.txt': {
      id: 'statement-wang',
      type: 'police_clue',
      category: '警方已知',
      relationObjectId: 'WANG_ZHENG',
      // Content search may use this natural case-fact term, but it must not
      // become an alias of the WANG_ZHENG reasoning object.
      searchAliases: ['匿名推荐']
    },
    '警方已知文本/P04_振华_警方已知.txt': { id: 'statement-zhenhua', type: 'police_clue', category: '警方已知' },
    '警方已知文本/P05_峥旧案调查.txt': { id: 'wang-investigation-initial', type: 'police_clue', category: '警方已知', relationObjectId: 'WANG_WIFE' },
    '警方已知文本/P06_振华磁带调查.txt': { id: 'zhenhua-investigation-initial', type: 'police_clue', category: '警方已知' },

    '视觉线索文本/V01_始磁带.txt': { id: 'tape-supplement', type: 'visual_clue', category: '视觉线索', relationObjectId: 'START_TAPE' },
    '视觉线索文本/V02_峥的拼接照片.txt': {
      id: 'wang-collage-photo',
      type: 'visual_clue',
      category: '视觉线索',
      relationObjectId: 'WANG_ZHENG_SPLICED_PHOTO'
    },

    '虚构推理/F01_磁带传音.txt': { id: 'story-letter', type: 'fictional_deduction', category: '虚构推理' },
    '虚构推理/F02_往日重现.txt': { id: 'story-question', type: 'fictional_deduction', category: '虚构推理' },
    '虚构推理/F03_无字情书.txt': { id: 'story-silent-letter', type: 'fictional_deduction', category: '虚构推理' },
    '虚构推理/F04_蛇选新娘.txt': { id: 'story-snake-bride', type: 'fictional_deduction', category: '虚构推理' },

    '终盘/C01_玲_网页版.txt': { id: 'novel-ling', type: 'terminal_chapter', category: '终盘' },
    '终盘/C02_枫_网页版.txt': { id: 'novel-feng', type: 'terminal_chapter', category: '终盘' },
    '终盘/C03a_岚_岚的过去.txt': {
      id: 'lan-past',
      type: 'terminal_chapter',
      category: '终盘',
      openingImage: 'cheng-lan-profile.png'
    },
    '终盘/C03b_岚_岚与峥.txt': { id: 'lan-and-zheng', type: 'terminal_chapter', category: '终盘' },
    '终盘/C03c_岚_离开与威胁.txt': { id: 'lan-leaving-and-threat', type: 'terminal_chapter', category: '终盘' },
    '终盘/C03d_岚_初识.txt': { id: 'lan-first-meeting', type: 'terminal_chapter', category: '终盘' },
    '终盘/C03e_岚_蛇咬.txt': {
      id: 'lan-snakebite',
      type: 'terminal_chapter',
      category: '终盘',
      endingImage: 'L02_似_岚从枫侧后方低语.png'
    },
    '终盘/C03f_岚_案发当日.txt': { id: 'lan-case-day', type: 'terminal_chapter', category: '终盘' },
    '终盘/C03g_岚_岚之死.txt': { id: 'lan-death', type: 'terminal_chapter', category: '终盘' }
  },
  gates: {
    'Gate专用文本源/嗒嗒.txt': { id: 'tapping', type: 'text_answer' },
    'Gate专用文本源/四个Force.txt': { id: 'force', type: 'relation' },
    'Gate专用文本源/真凶.txt': { id: 'final', type: 'final' }
  },
  images: {
    '案件文本/02_死亡现场.txt::death-scene.png': {
      sourcePath: '图片/尸体及检查情况/似_弥留之际.png',
      publicPath: '/content-assets/death-scene.png',
      kind: 'scene'
    },
    '案件文本/03_法医鉴定.txt::occipital-impact-injury.png': {
      sourcePath: '图片/尸体及检查情况/I01｜跌落后脑部撞击痕迹特写.png',
      publicPath: '/content-assets/occipital-impact-injury.png',
      kind: 'evidence'
    },
    '案件文本/04_右拇指创口.txt::right-thumb-wound.png': {
      sourcePath: '图片/尸体及检查情况/I02｜右手拇指异常创口特写.png',
      publicPath: '/content-assets/right-thumb-wound.png',
      kind: 'evidence'
    },
    '案件文本/05_枫家整体环境.txt::feng-home-floor-plan.png': {
      sourcePath: '图片/建筑设计/一楼布局图.png',
      publicPath: '/content-assets/feng-home-floor-plan.png',
      kind: 'scene'
    },
    '案件文本/05_枫家整体环境.txt::feng-home-exterior.png': {
      sourcePath: '图片/建筑设计/男主家外景图.png',
      publicPath: '/content-assets/feng-home-exterior.png',
      kind: 'scene'
    },
    '案件文本/08_新蛇符.txt::snake-talisman-damaged.png': {
      sourcePath: '图片/蛇符S/S02｜蛇符破损状态.png',
      publicPath: '/content-assets/snake-talisman-damaged.png',
      kind: 'evidence'
    },
    '案件文本/08_新蛇符.txt::snake-talisman-contents.png': {
      sourcePath: '图片/蛇符S/S03：蛇符破损后内部内容物特写.png',
      publicPath: '/content-assets/snake-talisman-contents.png',
      kind: 'evidence'
    },
    '案件文本/09_磁带箱.txt::cassette-box.png': {
      sourcePath: '图片/磁带M/M04 磁带箱.png',
      publicPath: '/content-assets/cassette-box.png',
      kind: 'evidence'
    },
    '警方已知文本/P01_玲_警方已知.txt::xu-ling-profile.png': {
      sourcePath: '图片/半身图（人物介绍的时候使用）/玲半身图.png',
      publicPath: '/content-assets/xu-ling-profile.png',
      kind: 'portrait'
    },
    '警方已知文本/P02_枫_警方已知.txt::zhou-feng-profile.png': {
      sourcePath: '图片/半身图（人物介绍的时候使用）/枫半身图.png',
      publicPath: '/content-assets/zhou-feng-profile.png',
      kind: 'portrait'
    },
    '警方已知文本/P03_峥_警方已知.txt::wang-zheng-profile.png': {
      sourcePath: '图片/半身图（人物介绍的时候使用）/王峥半身图.png',
      publicPath: '/content-assets/wang-zheng-profile.png',
      kind: 'portrait'
    },
    '警方已知文本/P04_振华_警方已知.txt::zhao-zhenhua-profile.png': {
      sourcePath: '图片/半身图（人物介绍的时候使用）/赵振华半身图.png',
      publicPath: '/content-assets/zhao-zhenhua-profile.png',
      kind: 'portrait'
    },
    '视觉线索文本/V01_始磁带.txt::m02-c-start-tape.png': {
      sourcePath: '图片/磁带M/M02-C 残破“始”关键磁带.png',
      publicPath: '/content-assets/m02-c-start-tape.png',
      kind: 'evidence'
    },
    '视觉线索文本/V02_峥的拼接照片.txt::wang-collage-photo.png': {
      sourcePath: '图片/插画/黑白与彩色拼接的照片.png',
      publicPath: '/content-assets/wang-collage-photo.png',
      kind: 'evidence'
    },
    '终盘/C03a_岚_岚的过去.txt::cheng-lan-profile.png': {
      sourcePath: '图片/半身图（人物介绍的时候使用）/程岚半身图.png',
      publicPath: '/content-assets/cheng-lan-profile.png',
      kind: 'portrait'
    },
    '终盘/C03e_岚_蛇咬.txt::L02_似_岚从枫侧后方低语.png': {
      sourcePath: '图片/插画/L02_似_岚从枫侧后方低语.png',
      publicPath: '/content-assets/插画/L02_似_岚从枫侧后方低语.png',
      kind: 'scene'
    }
  }
};

export const FORCE_OBJECT_MAP = {
  WANG_ZHENG: { label: '王峥', contentId: 'statement-wang', kind: 'person' },
  XU_LING: { label: '玲', contentId: 'statement-ling', kind: 'person' },
  CHENG_LAN: { label: '程岚', contentId: 'forensic-report', kind: 'person' },
  ZHOU_FENG: { label: '周枫', contentId: 'statement-feng', kind: 'person' },
  WANG_WIFE: { label: '王峥妻子', contentId: 'wang-investigation-initial', kind: 'person' },
  WANG_ZHENG_SPLICED_PHOTO: {
    label: '王峥的拼接照片',
    contentId: 'wang-collage-photo',
    kind: 'clue',
    canonicalId: 'wang-collage-photo'
  },
  OLD_TREATMENT_INTERPRETATION: { label: '王峥的旧治疗录音', contentId: 'recording-old-treatment', kind: 'clue' },
  NEW_TALISMAN: { label: '玲的新蛇符', contentId: 'snake-charm', kind: 'clue' },
  START_TAPE: { label: '“始”磁带', contentId: 'tape-supplement', kind: 'clue' }
};

export const FINAL_OBJECT_MAP = {
  FENG: { label: '周枫', contentId: 'statement-feng', kind: 'person', canonicalId: 'ZHOU_FENG' },
  TAPE_START: { label: '“始”磁带', contentId: 'tape-supplement', kind: 'clue', canonicalId: 'START_TAPE' },
  OLD_RECORDER_REWIND: { label: '旧收录机与手动回卷', contentId: 'old-recorder-rewind', kind: 'clue' },
  LAN_THUMB_WOUND: { label: '程岚右拇指创口', contentId: 'body-injuries', kind: 'clue' },
  TAPE_DISPOSAL: { label: '振华磁带调查', contentId: 'zhenhua-investigation-initial', kind: 'clue' }
};

/**
 * The current formal Gates do not use 赵振华 as an accepted answer, but the
 * person is a valid player-owned reasoning object once the police statement
 * is released.  Keeping this mapping beside the existing formal object maps
 * gives the picker one registry without adding a second character dataset.
 */
export const ENTITY_OBJECT_MAP = {
  ZHAO_ZHENHUA: { label: '赵振华', contentId: 'statement-zhenhua', kind: 'person' }
};

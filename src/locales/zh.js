const zh = {
  common: {
    loading: "加载中...",
    error: "错误",
    close: "关闭",
    cancel: "取消",
    confirm: "确认",
    select: "选择...",
    back: "返回",
    next: "下一步",
    random: "随机",
    settings: "设置",
    language: "语言",
    devMode: "开发者模式"
  },
  initialization: {
    title: "航班初始化",
    subtitle: "配置您的飞行参数",
    sections: {
      difficulty: "01. 运行等级 & 情报",
      parameters: "02. 飞行参数",
      route: "03. 航路选择"
    },
    difficulty: {
      rookie: "菜鸟",
      amateur: "业余",
      intermediate: "中等",
      advanced: "进阶",
      pro: "大佬",
      devil: "地狱",
      intel_label: "机组智能:",
      descriptions: {
        rookie: "高度支持。NPC协助所有检查。严格遵循标准程序。",
        amateur: "经验丰富的机组。在重大事件中提供可靠支持。NPC会提供协助。",
        intermediate: "标准操作。机组跟随指引并精确执行指令。",
        advanced: "能力强，但在高压条件下可能犹豫或犯小错。",
        pro: "高压环境。机组表现紧张，紧急情况下易犯重大错误。",
        devil: "独立优先级。可能主动偏离程序。不要依赖协助。",
        waiting: "等待选择难度..."
      }
    },
    parameters: {
      airline: "航空公司",
      callsign: "呼号",
      aircraft_type: "机型",
      crew_count: "机组人数",
      passengers: "乘客 (PAX)",
      payload: "载重 (KG)",
      cruise_height: "巡航高度 (FT)",
      reserve_fuel: "备用燃油 (HOURS)",
      zulu_time: "祖鲁时间",
      season: "季节",
      random_checkbox: "随机",
      seasons: {
        spring: "春",
        summer: "夏",
        autumn: "秋",
        winter: "冬"
      },
      placeholders: {
        operator: "运营人名称",
        flight_number: "航班号",
        count_range: "1-10",
        pax_range: "0-1000",
        weight_unit: "KG",
        height_unit: "FT",
        time_format: "HH:MMZ",
        hours: "HRS"
      }
    },
    route: {
      departure: "出发机场",
      arrival: "到达机场",
      search_placeholder: "搜索 ICAO/IATA..."
    },
    summary: {
      route: "航线:",
      distance: "距离:",
      est_time: "预计时间:",
      fuel_req: "燃油需求:",
      trip: "航程",
      rsv: "备用",
      total: "总计"
    },
    buttons: {
      next_params: "下一步: 飞行参数 →",
      next_route: "下一步: 航路选择 →",
      finalize: "完成签派 & 初始化"
    },
    messages: {
      random_initialized: "随机航班已初始化！",
      error_random: "初始化随机航班出错，请重试。",
      select_airports: "请选择出发地和目的地机场"
    },
    phases: {
      boarding: "登机",
      departure_clearance: "放行许可",
      pushback: "推出 & 启动",
      taxiing: "滑行",
      takeoff_prep: "起飞准备",
      takeoff: "起飞滑跑",
      initial_climb: "初始爬升",
      main_climb: "主要爬升",
      climb: "爬升",
      cruise: "巡航",
      descent: "下降",
      approach: "进近",
      landing: "着陆",
      after_land_taxiing: "滑行至登机口",
      shutoff: "关车",
      emergency: "紧急情况",
      post_mortem: "飞行报告"
    },
    tooltips: {
      random_difficulty: "随机难度",
      random_params: "随机参数",
      random_route: "随机航路"
    }
  },
  flight: {
    status: {
      starting: "正在启动飞行模拟...",
      init_physics: "正在初始化物理引擎...",
      error: "初始化错误",
      reload: "重新加载页面",
      ready: "就绪",
      paused: "已暂停",
      crashed: "严重故障",
      landed: "安全着陆",
      situation: "态势",
      checklist_incomplete: "检查单未完成",
      active_failures: "当前故障",
      critical: "严重",
      awaiting_instructions: "等待飞行指令...",
      prepare_takeoff: "准备起飞。",
      flight_ended: "飞行结束",
      return_init: "返回初始化"
    },
    sidebar: {
      checklist: "检查单",
      f_comp: "飞控电脑",
      systems: "系统",
      timer: "计时器",
      save_load: "存档/读取",
      inspect: "检查",
      settings: "设置"
    },
    panels: {
      radio: {
        title: "无线电",
        transmit: "发送",
        cancel: "取消",
        freq_busy: "频率繁忙",
        placeholder: "输入消息...",
        frequency: "频率"
      },
      systems: {
        engines: "引擎",
        hydraulics: "液压",
        electrics: "电力",
        fuel: "燃油",
        engine_label: "引擎"
      }
    },
    messages: {
      freq_busy: "[频率繁忙]"
    },
    alerts: {
      checklist_incomplete_content: "无法继续。缺少项目：{items}"
    },
    immersive: {
      systems_btn: "系统 [头顶面板]",
      awaiting: "等待指令...",
      continue: "继续 ►",
      startup_required: "⚠️ 需要启动"
    },
    panel: {
      system: {
        title: "系统状态",
        warnings: "警告",
        no_warnings: "无活动警告",
        labels: {
          n1: "N1转速",
          egt: "排气温度",
          fuel: "燃油",
          oil: "滑油",
          hyd: "液压",
          elec: "电力",
          gear: "起落架",
          flaps: "襟翼"
        },
        gear_state: {
          up: "收起",
          down: "放下"
        }
      }
    }
  },
  narrative: {
    labels: {
      designation: "代号:",
      background: "背景:",
      mission: "任务:",
      intelligence: "情报:",
      accept: "接受任务"
    },
    roles: [
      "机长", 
      "指挥官", 
      "责任机长", 
      "机长", 
      "总飞行师"
    ],
    experience: {
      rookie: [
        "刚从飞行学院毕业。执照上的墨迹还没干。",
        "入职航空公司的第一周。虽然紧张，但雄心勃勃。",
        "还在向总飞行师证明自己。今天的每一个动作都很重要。",
        "第一次坐在左座。别忘了你的训练。"
      ],
      amateur: [
        "正在积累飞行小时数。你了解这架飞机，但她有时仍会给你惊喜。",
        "随着每一段航程建立自信。你处理过平静的天空，但今天可能不同。",
        "不再是学员，但还不是老手。机组人员期待你那双稳定的手。",
        "开始在驾驶舱感到自在，尽管复杂的系统仍需全神贯注。"
      ],
      intermediate: [
        "准备晋升的资深副驾驶。你对程序烂熟于心。",
        "拥有数千小时经验的飞行员。标准操作已成为第二天性。",
        "可靠且稳重。航空公司将最有价值的航线托付给你。",
        "胜任且专注。你见过恶劣天气和技术故障。"
      ],
      advanced: [
        "资深机长。机组休息室里人们带着敬意谈论你的名字。",
        "天空老兵。你曾穿越飓风，也曾在引擎失效时着陆。",
        "教员考官。你编写了别人正在努力学习的手册。",
        "这支机队的大师。飞机感觉就像是你身体的延伸。"
      ],
      pro: [
        "传奇飞行员。据说你能在侧风中降落在邮票大小的地方。",
        "王牌飞行员。系统故障只是你展示技巧的机会。",
        "精英中的精英。当别人恐慌时，你只是看看手表。",
        "精英指挥官。没有什么能让你惊讶，即使是液压完全丧失。"
      ],
      devil: [
        "挑战极限的试飞员。安全余量只是建议。",
        "驾驶一架被诅咒的飞机。当你走向停机坪时，机械师在胸前划十字。",
        "面对不可能。困难重重，但这正是你喜欢的。",
        "即将体验一个旨在击垮你的模拟。祝你好运。"
      ]
    },
    flight_plan: [
      (dep, arr, pax) => `今天的舱单列出了从 ${dep} 到 ${arr} 的 ${pax} 名乘客。`,
      (dep, arr, pax) => `你已获准执行从 ${dep} 到 ${arr} 的航线，载有 ${pax} 名依赖你的乘客。`,
      (dep, arr, pax) => `飞行计划已提交：${dep} 出发，目的地 ${arr}。${pax} 名乘客正在安顿就座。`,
      (dep, arr, pax) => `从 ${dep} 的登机口到 ${arr} 的停机坪，今天你要对 ${pax} 条生命负责。`
    ],
    difficulty_desc: {
      rookie: [
        "系统报告正常。专注于你的决策和标准程序。",
        "预计是一次例行飞行，程序任务较少。你的机组全力支持。",
        "前方任务直截了当。可能会出现小问题，但用基本逻辑就能解决。"
      ],
      amateur: [
        "预计会有一个重大的操作挑战。保持简单，遵循检查单。",
        "今天可能会遇到有影响的情况，但你的机组已准备好协助处理工作量。",
        "警惕一个重大事件。直接控制需求保持较低，让你专注于管理。"
      ],
      intermediate: [
        "准备好应对动态条件和潜在干扰。这一段需要手动飞行。",
        "标准飞行协议适用，但要准备好应对优先级的变化和主动控制需求。",
        "你的机组将精确执行你的命令，但环境变得越来越不可预测。"
      ],
      advanced: [
        "多个关键问题可能同时发生。敏锐的操作和快速的决策至关重要。",
        "预计会出现必须手动控制的致命场景。注意你的机组——他们可能在压力下动摇。",
        "模拟今天将测试你的反应。动态故障需要持续关注和人工干预。"
      ],
      pro: [
        "系统性故障迫在眉睫。自动化不可靠；你是主要的控制回路。",
        "需要复杂的机组资源管理和娴熟的操作。你的机组压力很大，容易犯重大错误。",
        "致命的、相互关联的问题将挑战你的每一项技能。预计工作量很大，支持也会很紧张。"
      ],
      devil: [
        "预报完全混乱。没有自动驾驶，没有安全网，没有可靠的协助。",
        "飞机被推向极限。你的机组可能会主动让情况变得更糟。",
        "忘掉你的训练——这是为了生存。每个系统都是潜在的威胁，你的“帮手”也有自己的算盘。"
      ]
    }
  },
  cinematic: {
    review: {
      title: "飞行舱单",
      subtitle: "官方签派文件",
      date: "日期",
      time: "时间",
      page: "页码",
      sections: {
      flight_data: "01. 飞行数据",
      route_logistics: "02. 航路后勤",
      metar_env: "03. 气象 & 环境",
      risk: "04. 运行风险"
    },
    labels: {
      operator: "运营商",
      aircraft: "机型",
      origin: "出发地",
      destination: "目的地",
      pax_crew: "乘客/机组",
      payload: "载重",
      dep_gate: "出发登机口",
      arr_gate: "到达登机口",
      taxi_out: "滑出",
      taxi_in: "滑入",
      dep_rwy: "出发跑道",
      landing_rwy: "落地跑道",
      sid: "离场程序",
      star: "进场程序",
      waypoints: "航路点",
      wind: "风速",
      visibility: "能见度",
      turbulence: "颠簸",
      cloud_cover: "云量",
      difficulty: "难度",
      failure_mode: "故障模式"
    },
    confidential: "机密",
    button: "确认签派"
    }
  },
  route_selection: {
    title: "详细航路选择",
    mode: "{difficulty} 模式",
    departure: "出发地 ({airport})",
    arrival: "目的地 ({airport})",
    gate_ramp: "登机口/停机位",
    taxiway: "滑行道",
    runway: "跑道",
    select_runway: "选择跑道",
    sid: "离场程序 (SID)",
    star: "进场程序 (STAR)",
    enroute: "航路",
    waypoints: "航路点",
    generate: "生成",
    confirm: "确认航路",
    skip: "跳过 / 自动",
    cancel: "取消",
    approach: "进近",
    final: "五边",
    placeholder_gate: "例如 A12",
    placeholder_taxi: "例如 A",
    placeholder_sid: "例如 OMA12D"
  },
  search: {
    clear: "清除选择",
    results_found: "找到 {count} 个机场",
    placeholder_dep: "搜索出发地 (如 PEK, 北京)",
    placeholder_arr: "搜索目的地 (如 SHA, 上海)"
  }
};

export default zh;

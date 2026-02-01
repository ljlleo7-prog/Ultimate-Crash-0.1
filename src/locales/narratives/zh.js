const zhNarratives = {
  phases: {
    boarding: {
      default: {
        0: { title: "开始登机", content: "旅客正在{departure}登机乘坐{callsign}。" },
        1: { title: "最后呼叫", content: "{callsign}最后一次登机呼叫。舱门即将关闭。" },
        2: { title: "客舱准备", content: "客舱乘务员准备起飞。旅客已就座。" }
      },
      sunny: {
        0: { title: "美好的一天", content: "阳光透过窗户洒入，旅客正在登机乘坐{callsign}。" }
      },
      rainy: {
        0: { title: "雨中出发", content: "旅客收起雨伞，在雨中登机乘坐{callsign}。" }
      },
      shakespearean: {
        0: { title: "登机序幕", content: "朋友们，罗马人，同胞们，请听我说；我们的金属战车在{departure}等候。" }
      }
    },
    departure_clearance: {
      default: {
        0: { title: "申请放行", content: "{callsign}申请前往{arrival}的仪表飞行规则放行。" },
        1: { title: "飞行计划已归档", content: "收到飞行计划。许可按飞行计划航路前往{arrival}。" },
        2: { title: "复诵正确", content: "复诵正确。联系地面申请推出。" }
      },
      shakespearean: {
        0: { title: "许可", content: "我们寻求塔台的祝福，踏上前往{arrival}的旅程。" }
      }
    },
    pushback: {
      default: {
        0: { title: "批准推出", content: "地面管制批准推出。引擎区净空。" },
        1: { title: "拖车连接", content: "拖杆已连接。刹车松开。正在推出。" },
        2: { title: "引擎启动", content: "启动引擎。N2上升。油压正常。" }
      },
      rainy: {
        0: { title: "湿滑推出", content: "拖车在雨中艰难地推动飞机后退。" }
      },
      shakespearean: {
        0: { title: "后退之舞", content: "我们撤离登机口，就像骑士撤出宫廷。" }
      }
    },
    taxiing: {
      default: {
        0: { title: "滑行至跑道", content: "滑行至使用跑道。飞控检查。" },
        1: { title: "跑道外等待", content: "在跑道外等待。五边有活动交通。" },
        2: { title: "进跑道", content: "许可进跑道等待。" }
      },
      sunny: {
        0: { title: "阳光下滑行", content: "在阳光照耀下，{callsign}滑行至跑道。" }
      },
      rainy: {
        0: { title: "雨中滑行", content: "雨刷开启。{callsign}在湿滑的道面上小心滑行。" }
      },
      shakespearean: {
        0: { title: "滚动进近", content: "我们在轮子上滑向命运，跑道在召唤。" }
      }
    },
    takeoff_prep: {
      default: {
        0: { title: "准备起飞", content: "检查单完成。客舱安全。" },
        1: { title: "起飞简报", content: "V1，抬轮，V2。如果出现紧急情况，我们返航。" },
        2: { title: "联系塔台", content: "塔台，{callsign}准备好离场。" }
      },
      rookie: {
        title: "紧张的准备", content: "检查了两遍。手心出汗。"
      },
      shakespearean: {
        0: { title: "信仰之跃", content: "再一次冲击缺口，亲爱的朋友们，再一次！" }
      }
    },
    takeoff: {
      default: {
        0: { title: "起飞滑跑", content: "推力设置。空速由零增加。" },
        1: { title: "V1 抬轮", content: "V1... 抬轮。正上升率。" },
        2: { title: "收轮", content: "收轮。收襟翼。联系离场。" }
      },
      rookie: {
        title: "不稳的起飞", content: "有点摇晃，但我们起飞了。"
      },
      rainy: {
        0: { title: "雨中起飞", content: "溅起水花，我们升入灰色的云层。" }
      },
      shakespearean: {
        0: { title: "升天", content: "我们挣脱大地的束缚，触摸上帝的脸庞。" }
      }
    },
    initial_climb: {
      default: {
        0: { title: "爬升", content: "爬升至指定高度。" },
        1: { title: "离场管制", content: "雷达识别。航向090。" },
        2: { title: "穿云", content: "穿过云层。" }
      },
      rookie: {
        title: "稳定姿态", content: "努力保持机头对准地平线。"
      },
      sunny: {
        0: { title: "爬升入蓝天", content: "冲破雾霾，进入清澈的蓝天。" }
      },
      rainy: {
        0: { title: "云中爬升", content: "进入云团。能见度为零。" }
      },
      shakespearean: {
        0: { title: "向上之路", content: "更高，再高，你从大地跃起。" }
      }
    },
    main_climb: {
      default: {
        0: { title: "爬升至巡航", content: "通过10,000英尺。灯光关闭。" },
        1: { title: "气流平稳", content: "爬升性能正常。" },
        2: { title: "过渡高度", content: "标准气压。18,000英尺。" }
      },
      shakespearean: {
        0: { title: "翱翔", content: "我们攀登空气之山，迈向旅程的顶峰。" }
      }
    },
    cruise: {
      default: {
        0: { title: "巡航高度", content: "到达巡航高度。自动驾驶接通。" },
        1: { title: "客舱服务", content: "安全带指示灯熄灭。餐饮服务开始。" },
        2: { title: "导航检查", content: "航路点检查。燃油流量正常。" }
      },
      sunny: {
        0: { title: "平稳巡航", content: "视野中没有一片云。下方的大地如地图般展开。" }
      },
      shakespearean: {
        0: { title: "高空之路", content: "在苍穹与大地之间，我们保持航向。" }
      }
    },
    descent: {
      default: {
        0: { title: "开始下降", content: "下降顶点。油门慢车。" },
        1: { title: "穿越高度", content: "穿越10,000英尺。灯光开启。" },
        2: { title: "进近简报", content: "简报确认。着陆数据已设置。" }
      },
      rainy: {
        0: { title: "降入阴霾", content: "下降进入风暴前锋。" }
      },
      shakespearean: {
        0: { title: "归途", content: "有上必有下。我们开始重返大地。" }
      }
    },
    approach: {
      default: {
        0: { title: "进近", content: "雷达引导切入五边。" },
        1: { title: "截获航向道", content: "航向道截获。下滑道工作。" },
        2: { title: "许可着陆", content: "放下起落架。三绿。许可着陆。" }
      },
      rainy: {
        0: { title: "仪表进近", content: "依赖仪表。即将看见跑道..." }
      },
      shakespearean: {
        0: { title: "最后一英里", content: "大地升起迎接我们，像一位老朋友。" }
      }
    },
    landing: {
      default: {
        0: { title: "最终进近", content: "500... 100... 50..." },
        1: { title: "接地", content: "接地。扰流板预位。反推。" },
        2: { title: "滑跑", content: "60节。人工刹车。脱离跑道。" }
      },
      rainy: {
        0: { title: "湿滑着陆", content: "有水漂风险。果断接地。" }
      },
      shakespearean: {
        0: { title: "抵达", content: "我们再次亲吻了大地。" }
      }
    },
    after_land_taxiing: {
      default: {
        0: { title: "滑行至登机口", content: "欢迎来到{arrival}。请保持就座。" },
        1: { title: "地面管制", content: "联系地面。经由Alpha滑行至登机口。" },
        2: { title: "泊位", content: "接近登机口。看到引导员。" }
      },
      shakespearean: {
        0: { title: "最后的滚动", content: "旅程结束，大门在等待。" }
      }
    },
    shutoff: {
      default: {
        0: { title: "关车", content: "停留刹车刹好。引擎切断。" },
        1: { title: "下机", content: "安全带指示灯熄灭。舱门解除预位。" },
        2: { title: "飞行结束", content: "欢迎到达目的地。飞行结束。" }
      },
      shakespearean: {
        0: { title: "寂静", content: "巨兽沉睡。我们的工作完成了。" }
      }
    }
  },
  failures: {
    engine: {
      minor: "引擎 {engineIndex} EGT 快速上升。检测到震动。",
      critical: "引擎 {engineIndex} 起火！立即关闭引擎。",
      resolved: "引擎 {engineIndex} 恢复正常运行。"
    },
    hydraulic: {
      minor: "主液压压力下降。检查系统。",
      critical: "主液压系统失效！需要手动恢复！",
      resolved: "液压压力稳定。系统已恢复。"
    },
    electrical: {
      minor: "电气汇流条 {bus} 出现间歇性断电。",
      critical: "主电气汇流条失效！启用应急电源！",
      resolved: "电气汇流条电力恢复正常水平。"
    },
    fuel: {
      minor: "检测到燃油不平衡。自动接通交输供油。",
      critical: "检测到燃油泄漏！燃油正在快速流失！",
      resolved: "燃油不平衡已解决。"
    },
    title: {
      alert: "系统警报",
      critical: "严重故障警报",
      restored: "系统恢复"
    }
  },
  defaults: {
    failure: {
      minor: "检测到系统 {type} 故障。",
      critical: "系统 {type} 严重故障！",
      resolved: "系统 {type} 已恢复。"
    }
  }
};

export default zhNarratives;

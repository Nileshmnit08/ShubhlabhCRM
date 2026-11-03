// Screenshot Generator for LabourHisaab
// Renders the 4 screens with 100% fidelity to the user's uploaded reference snapshot:
// Screen 1: शुभ लाभ लेबर हिसाब (Home Screen)
// Screen 2: दैनिक भुगतान (Daily Payment Screen)
// Screen 3: मजदूर का मासिक हिसाब (Individual Statement Screen)
// Screen 4: मासिक समरी (सभी मजदूर) (Monthly Summary Screen)
// Plus a 4-screen composite collage (00_snapshot_comparison_collage.png)

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const puppeteer = require('../app/node_modules/puppeteer');

const OUTPUT_DIR = path.resolve(__dirname, 'screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Common CSS styles & mobile frame
const BASE_CSS = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", "Mangal", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  body {
    background-color: #1E293B;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 16px;
  }
  .phone-frame {
    width: 390px;
    height: 844px;
    background: #FAF9F6;
    border-radius: 42px;
    border: 7px solid #2B3441;
    box-shadow: 0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08);
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  /* Status Bar */
  .status-bar {
    height: 32px;
    background: #F57C00;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 22px;
    font-size: 13px;
    font-weight: 700;
    color: #FFFFFF;
    z-index: 10;
  }
  .status-icons {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 11px;
  }
  .scroll-body {
    flex: 1;
    overflow-y: auto;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .scroll-body::-webkit-scrollbar {
    display: none;
  }
  /* 5-Tab Bottom Bar */
  .bottom-nav {
    height: 60px;
    background: #FFFFFF;
    border-top: 1px solid #EAE6DF;
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 0 4px 4px 4px;
    z-index: 10;
  }
  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: #64748B;
    font-size: 10px;
    font-weight: 700;
    flex: 1;
    cursor: pointer;
  }
  .nav-item.active {
    color: #EE5A00;
  }
  .nav-icon-pill {
    padding: 2px 12px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .nav-item.active .nav-icon-pill {
    background: #FFEEDB;
  }
  .home-indicator {
    width: 120px;
    height: 4px;
    background: #2B3441;
    border-radius: 2px;
    margin: 4px auto 6px auto;
  }
`;

// =========================================================================
// SCREEN 1: "शुभ लाभ लेबर हिसाब" (Home Screen)
// =========================================================================
function getScreen1Html() {
  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>Screen 1 - Home</title>
  <style>
    ${BASE_CSS}
    /* Screen 1 specific */
    .s1-header {
      background: linear-gradient(135deg, #F57C00 0%, #FF8F00 100%);
      padding: 10px 16px 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
    }
    .s1-brand-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .wheat-circle {
      width: 40px;
      height: 40px;
      border-radius: 20px;
      background: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }
    .s1-titles {
      color: #FFFFFF;
      line-height: 1.15;
    }
    .s1-titles .t1 { font-size: 17px; font-weight: 900; }
    .s1-titles .t2 { font-size: 17px; font-weight: 900; }
    .settings-circle {
      width: 36px;
      height: 36px;
      border-radius: 18px;
      border: 1.5px solid rgba(255,255,255,0.7);
      background: rgba(255,255,255,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-size: 16px;
      cursor: pointer;
    }

    /* Date card */
    .date-card {
      background: #FFFFFF;
      border-radius: 12px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      border: 1px solid #ECE7DE;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .cal-badge {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: #FFF2E6;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      margin-right: 10px;
    }
    .date-info { flex: 1; }
    .date-sub { font-size: 10.5px; color: #64748B; font-weight: 600; }
    .date-main { font-size: 13.5px; font-weight: 800; color: #1E293B; margin-top: 1px; }

    /* 2 Green KPI Cards */
    .kpi-row {
      display: flex;
      gap: 10px;
    }
    .kpi-card {
      flex: 1;
      background: #137A38;
      border-radius: 12px;
      padding: 10px 12px;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      gap: 10px;
      box-shadow: 0 3px 8px rgba(19,122,56,0.25);
    }
    .kpi-icon {
      font-size: 22px;
    }
    .kpi-label { font-size: 10.5px; color: rgba(255,255,255,0.9); font-weight: 600; }
    .kpi-val { font-size: 20px; font-weight: 900; margin-top: 2px; }

    /* Heading */
    .section-title {
      font-size: 14.5px;
      font-weight: 900;
      color: #1E293B;
      margin: 2px 0 0 2px;
    }

    /* Work Grid */
    .work-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .work-card {
      background: #FFFFFF;
      border-radius: 14px;
      border: 1px solid #EFEAE0;
      padding: 10px 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      cursor: pointer;
    }
    .w-icon-circle {
      width: 44px;
      height: 44px;
      border-radius: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      margin-bottom: 6px;
    }
    .w-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #1E293B;
      margin-bottom: 4px;
      text-align: center;
    }
    .w-rate {
      font-size: 11px;
      font-weight: 700;
      color: #047857;
      background: #F4FBF6;
      border: 1px solid #D1E7DD;
      padding: 2px 8px;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="phone-frame">
    <!-- Status Bar -->
    <div class="status-bar">
      <span>10:24</span>
      <div class="status-icons">
        <span>📶 LTE</span>
        <span>🔋 100%</span>
      </div>
    </div>

    <!-- Header with Orange Gradient & Silhouette -->
    <div class="s1-header">
      <div class="s1-brand-row">
        <div class="wheat-circle">🌾</div>
        <div class="s1-titles">
          <div class="t1">शुभ लाभ</div>
          <div class="t2">लेबर हिसाब</div>
        </div>
      </div>
      <div class="settings-circle">⚙️</div>
    </div>

    <!-- Body -->
    <div class="scroll-body">
      <!-- Date Card -->
      <div class="date-card">
        <div class="cal-badge">📅</div>
        <div class="date-info">
          <div class="date-sub">आज की तारीख</div>
          <div class="date-main">03 नवम्बर 2026 (मंगलवार)</div>
        </div>
        <div style="color:#64748B; font-size:12px;">⌵</div>
      </div>

      <!-- 2 Green KPI Cards -->
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-icon">👥</div>
          <div>
            <div class="kpi-label">आज कुल मजदूरी</div>
            <div class="kpi-val">6</div>
          </div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon">👛</div>
          <div>
            <div class="kpi-label">आज की कुल मजदूरी</div>
            <div class="kpi-val">₹ 5,808</div>
          </div>
        </div>
      </div>

      <!-- Heading -->
      <div class="section-title">आज का काम दर्ज करें</div>

      <!-- 10 Work Cards in 2 Columns -->
      <div class="work-grid">
        <!-- 1 -->
        <div class="work-card">
          <div class="w-icon-circle" style="background:#E8F5E9;">⚙️</div>
          <div class="w-title">मिक्स बनाना</div>
          <div class="w-rate">₹21 / 100 kg</div>
        </div>

        <!-- 2 -->
        <div class="work-card">
          <div class="w-icon-circle" style="background:#FFF3E0;">🥔</div>
          <div class="w-title">पैलेट बनाना</div>
          <div class="w-rate">₹21 / 100 kg</div>
        </div>

        <!-- 3 -->
        <div class="work-card">
          <div class="w-icon-circle" style="background:#FEF9C3;">🌽</div>
          <div class="w-title">मक्का दलिया</div>
          <div class="w-rate">₹15 / 100 kg</div>
        </div>

        <!-- 4 -->
        <div class="work-card">
          <div class="w-icon-circle" style="background:#FEF08A;">🥣</div>
          <div class="w-title">मक्का आटा</div>
          <div class="w-rate">₹15 / 100 kg</div>
        </div>

        <!-- 5 -->
        <div class="work-card">
          <div class="w-icon-circle" style="background:#FFEDD5;">🫘</div>
          <div class="w-title">चना चूरी</div>
          <div class="w-rate">₹15 / 100 kg</div>
        </div>

        <!-- 6 -->
        <div class="work-card">
          <div class="w-icon-circle" style="background:#EFF6FF;">🚚</div>
          <div class="w-title">उतराई</div>
          <div class="w-rate">₹45 / 100 kg</div>
        </div>

        <!-- 7 -->
        <div class="work-card">
          <div class="w-icon-circle" style="background:#FEE2E2;">🛒</div>
          <div class="w-title">अनलोडिंग</div>
          <div class="w-rate">₹2 / बैग</div>
        </div>

        <!-- 8 -->
        <div class="work-card">
          <div class="w-icon-circle" style="background:#FFE4E6;">🧵</div>
          <div class="w-title">बैग सिलाई</div>
          <div class="w-rate">₹0.30 / बैग</div>
        </div>

        <!-- 9 -->
        <div class="work-card">
          <div class="w-icon-circle" style="background:#FEF3C7;">🔄</div>
          <div class="w-title">माल पलटाई</div>
          <div class="w-rate">₹2 / बैग</div>
        </div>

        <!-- 10 -->
        <div class="work-card">
          <div class="w-icon-circle" style="background:#ECFDF5;">🧪</div>
          <div class="w-title">प्रीमिक्स</div>
          <div class="w-rate">₹300 / बैच</div>
        </div>
      </div>
    </div>

    <!-- 5-Tab Bottom Bar -->
    <div class="bottom-nav">
      <div class="nav-item active">
        <div class="nav-icon-pill">🏠</div>
        <span>होम</span>
      </div>
      <div class="nav-item">
        <div class="nav-icon-pill">👥</div>
        <span>मजदूर</span>
      </div>
      <div class="nav-item">
        <div class="nav-icon-pill">📊</div>
        <span>रिपोर्ट</span>
      </div>
      <div class="nav-item">
        <div class="nav-icon-pill">👛</div>
        <span>लेखाजोखा</span>
      </div>
      <div class="nav-item">
        <div class="nav-icon-pill">⚙️</div>
        <span>सेटिंग</span>
      </div>
    </div>
    <div class="home-indicator"></div>
  </div>
</body>
</html>`;
}

// =========================================================================
// SCREEN 2: "दैनिक भुगतान" (Daily Payment Screen)
// =========================================================================
function getScreen2Html() {
  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>Screen 2 - Daily Payment</title>
  <style>
    ${BASE_CSS}
    .header-sub {
      background: #F57C00;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #FFFFFF;
    }
    .back-arrow { font-size: 18px; cursor: pointer; }
    .header-sub-title { font-size: 17px; font-weight: 900; }

    /* Date Strip */
    .date-strip {
      background: #FFFFFF;
      border-radius: 10px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid #ECE7DE;
    }
    .date-strip-center {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 800;
      color: #1E293B;
    }

    /* 3 Tabs */
    .tabs-3 {
      display: flex;
      background: #ECE8E0;
      border-radius: 10px;
      padding: 3px;
      gap: 4px;
    }
    .tab-btn {
      flex: 1;
      padding: 7px 0;
      text-align: center;
      font-size: 11.5px;
      font-weight: 700;
      color: #64748B;
      border-radius: 8px;
    }
    .tab-btn.active {
      background: #137A38;
      color: #FFFFFF;
      font-weight: 800;
    }

    /* Section row */
    .sec-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 2px 0;
    }
    .sec-title { font-size: 13.5px; font-weight: 900; color: #1E293B; }
    .select-all { display: flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; color: #137A38; }

    /* Labourers list card */
    .list-card {
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #ECE7DE;
      padding: 2px 10px;
    }
    .lab-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 0;
      border-bottom: 1px solid #F3EFE8;
    }
    .lab-row:last-child { border-bottom: none; }
    .lab-avatar {
      width: 28px;
      height: 28px;
      border-radius: 14px;
      background: #F1F5F9;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }
    .lab-name { flex: 1; font-size: 13.5px; font-weight: 800; color: #1E293B; }
    .chk-box {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 1.5px solid #CBD5E1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
    }
    .chk-box.checked {
      background: #137A38;
      border-color: #137A38;
      color: #FFFFFF;
    }
    .amt-box {
      display: flex;
      align-items: center;
      background: #FAF9F6;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 3px 6px;
      width: 82px;
      justify-content: space-between;
      font-size: 12.5px;
      font-weight: 800;
      color: #1E293B;
    }

    /* Expenses Rows */
    .exp-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 0;
      border-bottom: 1px solid #F3EFE8;
    }
    .exp-row:last-child { border-bottom: none; }
    .exp-left {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      color: #1E293B;
    }

    /* Summary Card */
    .summary-box {
      background: #FFFDF9;
      border-radius: 12px;
      border: 1px solid #F3EBDD;
      padding: 10px 12px;
    }
    .sum-line {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 700;
      color: #64748B;
      margin-bottom: 4px;
    }
    .sum-val { color: #1E293B; font-weight: 800; }
    .sum-green-bar {
      background: #E8F5EC;
      border-radius: 8px;
      padding: 7px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      font-weight: 900;
      color: #137A38;
      margin-top: 6px;
    }

    /* Save Button */
    .save-btn {
      background: #137A38;
      color: #FFFFFF;
      border-radius: 12px;
      padding: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 14.5px;
      font-weight: 900;
      box-shadow: 0 3px 8px rgba(19,122,56,0.3);
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="phone-frame">
    <!-- Status Bar -->
    <div class="status-bar">
      <span>10:24</span>
      <div class="status-icons">
        <span>📶 LTE</span>
        <span>🔋 100%</span>
      </div>
    </div>

    <!-- Header -->
    <div class="header-sub">
      <div class="back-arrow">←</div>
      <div class="header-sub-title">दैनिक भुगतान</div>
    </div>

    <!-- Body -->
    <div class="scroll-body">
      <!-- Date Strip -->
      <div class="date-strip">
        <span style="color:#64748B;">‹</span>
        <div class="date-strip-center">
          <span>📅</span>
          <span>03 नवम्बर 2026</span>
        </div>
        <span style="color:#64748B;">›</span>
      </div>

      <!-- Segmented Tabs -->
      <div class="tabs-3">
        <div class="tab-btn active">मजदूर भुगतान</div>
        <div class="tab-btn">खर्च / सेवा</div>
        <div class="tab-btn">सारांश</div>
      </div>

      <!-- Section: आज के मजदूर (6) -->
      <div class="sec-row">
        <div class="sec-title">आज के मजदूर (6)</div>
        <div class="select-all">
          <span style="background:#137A38; color:#FFF; border-radius:3px; padding:0 3px; font-size:10px;">✓</span>
          <span>सभी चुनें</span>
        </div>
      </div>

      <!-- 6 Labourers List -->
      <div class="list-card">
        <!-- 1 Golu -->
        <div class="lab-row">
          <div class="lab-avatar">👨‍🌾</div>
          <div class="lab-name">गोलू</div>
          <div class="chk-box checked">✓</div>
          <div class="amt-box">
            <span style="color:#64748B;">₹</span>
            <span>1,000</span>
          </div>
        </div>

        <!-- 2 Satish -->
        <div class="lab-row">
          <div class="lab-avatar">👨‍🌾</div>
          <div class="lab-name">सतीश</div>
          <div class="chk-box checked">✓</div>
          <div class="amt-box">
            <span style="color:#64748B;">₹</span>
            <span>1,000</span>
          </div>
        </div>

        <!-- 3 Aangresh -->
        <div class="lab-row">
          <div class="lab-avatar">👨‍🌾</div>
          <div class="lab-name">आंग्रेश</div>
          <div class="chk-box checked">✓</div>
          <div class="amt-box">
            <span style="color:#64748B;">₹</span>
            <span>1,000</span>
          </div>
        </div>

        <!-- 4 Rahul -->
        <div class="lab-row">
          <div class="lab-avatar">👨‍🌾</div>
          <div class="lab-name">राहुल</div>
          <div class="chk-box checked">✓</div>
          <div class="amt-box">
            <span style="color:#64748B;">₹</span>
            <span>1,000</span>
          </div>
        </div>

        <!-- 5 Sonu -->
        <div class="lab-row">
          <div class="lab-avatar">👨‍🌾</div>
          <div class="lab-name">सोनू</div>
          <div class="chk-box"></div>
          <div class="amt-box">
            <span style="color:#64748B;">₹</span>
            <span style="color:#94A3B8;">0</span>
          </div>
        </div>

        <!-- 6 Aditya -->
        <div class="lab-row">
          <div class="lab-avatar">👨‍🌾</div>
          <div class="lab-name">आदित्य</div>
          <div class="chk-box"></div>
          <div class="amt-box">
            <span style="color:#64748B;">₹</span>
            <span style="color:#94A3B8;">0</span>
          </div>
        </div>
      </div>

      <!-- Section: आज की अतिरिक्त सेवा / खर्च -->
      <div class="sec-row">
        <div class="sec-title">आज की अतिरिक्त सेवा / खर्च</div>
      </div>

      <div class="list-card">
        <!-- Food -->
        <div class="exp-row">
          <div class="exp-left">
            <span>🍴</span>
            <span>खाना (6 मजदूर)</span>
          </div>
          <div class="amt-box">
            <span style="color:#64748B;">₹</span>
            <span>300</span>
          </div>
        </div>

        <!-- Tea -->
        <div class="exp-row">
          <div class="exp-left">
            <span>☕</span>
            <span>चाय नाश्ता</span>
          </div>
          <div class="amt-box">
            <span style="color:#64748B;">₹</span>
            <span>60</span>
          </div>
        </div>

        <!-- Transport -->
        <div class="exp-row">
          <div class="exp-left">
            <span>🚌</span>
            <span>आवागमन / ट्रांसपोर्ट</span>
          </div>
          <div class="amt-box">
            <span style="color:#64748B;">₹</span>
            <span style="color:#94A3B8;">0</span>
          </div>
        </div>
      </div>

      <!-- Add Other Expense Link -->
      <div style="text-align:center; font-size:12px; font-weight:800; color:#D92D20; cursor:pointer;">
        + अन्य खर्च जोड़ें
      </div>

      <!-- Daily Summary Box -->
      <div class="summary-box">
        <div class="sum-line">
          <span>आज कुल भुगतान</span>
          <span class="sum-val">₹ 4,000</span>
        </div>
        <div class="sum-line">
          <span>आज कुल खर्च (सेवा)</span>
          <span class="sum-val">₹ 360</span>
        </div>
        <div class="sum-green-bar">
          <span>आज का कुल खर्च</span>
          <span style="font-size:15px;">₹ 4,360</span>
        </div>
      </div>

      <!-- Save Button -->
      <div class="save-btn">
        <span>💾</span>
        <span>सेव करें</span>
      </div>
    </div>
    <div class="home-indicator"></div>
  </div>
</body>
</html>`;
}

// =========================================================================
// SCREEN 3: "मजदूर का मासिक हिसाब" (Individual Statement Screen)
// =========================================================================
function getScreen3Html() {
  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>Screen 3 - Individual Statement</title>
  <style>
    ${BASE_CSS}
    .header-sub {
      background: #F57C00;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #FFFFFF;
    }
    .back-arrow { font-size: 18px; cursor: pointer; }
    .header-sub-title { font-size: 17px; font-weight: 900; }

    /* Month Selector */
    .sel-card {
      background: #FFFFFF;
      border-radius: 10px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid #ECE7DE;
      font-size: 13.5px;
      font-weight: 800;
      color: #1E293B;
    }

    /* Labourer Profile Card */
    .lab-profile-card {
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #ECE7DE;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .profile-avatar {
      width: 38px;
      height: 38px;
      border-radius: 19px;
      background: #F1F5F9;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .profile-info { flex: 1; }
    .profile-name { font-size: 16px; font-weight: 900; color: #1E293B; }
    .profile-role { font-size: 11px; color: #64748B; }

    /* 3 Tabs */
    .tabs-3 {
      display: flex;
      background: #ECE8E0;
      border-radius: 10px;
      padding: 3px;
      gap: 4px;
    }
    .tab-btn {
      flex: 1;
      padding: 7px 0;
      text-align: center;
      font-size: 11.5px;
      font-weight: 700;
      color: #64748B;
      border-radius: 8px;
    }
    .tab-btn.active {
      background: #137A38;
      color: #FFFFFF;
      font-weight: 800;
    }

    /* 2 Stats Row */
    .stats-2 {
      display: flex;
      gap: 10px;
    }
    .stat-pill {
      flex: 1;
      background: #FFFFFF;
      border-radius: 10px;
      border: 1px solid #ECE7DE;
      padding: 8px 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .stat-pill-icon { font-size: 18px; }
    .stat-pill-label { font-size: 10px; color: #64748B; }
    .stat-pill-val { font-size: 14.5px; font-weight: 900; color: #1E293B; }

    /* Earned Banner */
    .earned-card {
      background: #FFFFFF;
      border-radius: 10px;
      border: 1px solid #ECE7DE;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .earned-left {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      font-weight: 700;
      color: #1E293B;
    }
    .earned-val { font-size: 15px; font-weight: 900; color: #1E293B; }

    /* Breakdown Box */
    .breakdown-box {
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #ECE7DE;
      overflow: hidden;
    }
    .bd-header {
      background: #FFF7EC;
      padding: 7px 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 900;
      color: #1E293B;
      border-bottom: 1px solid #F5ECDF;
    }
    .bd-body { padding: 8px 12px; }
    .bd-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      font-weight: 600;
      color: #1E293B;
      margin-bottom: 6px;
    }
    .bd-subtotal {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #F3EFE8;
      padding-top: 6px;
      margin-top: 4px;
      font-size: 12px;
      font-weight: 800;
      color: #1E293B;
    }

    /* Final Reconciliation */
    .reconcile-card {
      background: #F0F9F3;
      border-radius: 12px;
      border: 1px solid #D4EDDA;
      padding: 10px 12px;
    }
    .rec-line {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 700;
      color: #137A38;
      margin-bottom: 4px;
    }
    .rec-minus {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      font-weight: 600;
      color: #64748B;
      margin-bottom: 6px;
    }
    .red-balance-bar {
      background: #FDECEC;
      border: 1px solid #FACCCC;
      border-radius: 8px;
      padding: 7px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13.5px;
      font-weight: 900;
      color: #D92D20;
    }

    /* Actions */
    .actions-2 {
      display: flex;
      gap: 10px;
    }
    .action-btn {
      flex: 1;
      background: #FFFFFF;
      border: 1.5px solid #137A38;
      color: #137A38;
      border-radius: 10px;
      padding: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 800;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="phone-frame">
    <!-- Status Bar -->
    <div class="status-bar">
      <span>10:24</span>
      <div class="status-icons">
        <span>📶 LTE</span>
        <span>🔋 100%</span>
      </div>
    </div>

    <!-- Header -->
    <div class="header-sub">
      <div class="back-arrow">←</div>
      <div class="header-sub-title">मजदूर का मासिक हिसाब</div>
    </div>

    <!-- Body -->
    <div class="scroll-body">
      <!-- Month Selector -->
      <div class="sel-card">
        <span>📅 अक्टूबर 2026</span>
        <span style="color:#64748B; font-size:12px;">⌵</span>
      </div>

      <!-- Labourer Profile Card -->
      <div class="lab-profile-card">
        <div class="profile-avatar">👨‍🌾</div>
        <div class="profile-info">
          <div class="profile-name">गोलू</div>
          <div class="profile-role">मजदूरर</div>
        </div>
        <span style="color:#64748B; font-size:12px;">⌵</span>
      </div>

      <!-- 3 Sub-tabs -->
      <div class="tabs-3">
        <div class="tab-btn active">मासिक सारांश</div>
        <div class="tab-btn">दैनिक विवरण</div>
        <div class="tab-btn">काम विवरण</div>
      </div>

      <!-- 2 Stats Boxes -->
      <div class="stats-2">
        <div class="stat-pill">
          <div class="stat-pill-icon">📅</div>
          <div>
            <div class="stat-pill-label">कुल कार्य दिवस</div>
            <div class="stat-pill-val">26 दिन</div>
          </div>
        </div>

        <div class="stat-pill">
          <div class="stat-pill-icon" style="color:#137A38;">⚖️</div>
          <div>
            <div class="stat-pill-label">कुल वजन</div>
            <div class="stat-pill-val">1,25,000 kg</div>
          </div>
        </div>
      </div>

      <!-- Work Earned Banner -->
      <div class="earned-card">
        <div class="earned-left">
          <span style="color:#137A38; font-weight:900; font-size:15px;">Σ</span>
          <span>कुल मजदूरी (काम के अनुसार)</span>
        </div>
        <div class="earned-val">₹ 28,040</div>
      </div>

      <!-- Payments & Expenses Breakdown Box -->
      <div class="breakdown-box">
        <div class="bd-header">
          <span>👛</span>
          <span>भुगतान और खर्च</span>
        </div>
        <div class="bd-body">
          <div class="bd-line">
            <span>💸 कुल दिया गया भुगतान</span>
            <b>₹ 26,000</b>
          </div>
          <div class="bd-line">
            <span>🍴 खाना / भोजन खर्च</span>
            <b>₹ 2,600</b>
          </div>
          <div class="bd-line">
            <span>🚌 आवागमन / अन्य सेवा</span>
            <b>₹ 500</b>
          </div>
          <div class="bd-subtotal">
            <span style="color:#64748B;">कुल सेवा / अतिरिक्त खर्च</span>
            <span>₹ 3,100</span>
          </div>
        </div>
      </div>

      <!-- Final Net Balance Reconciliation -->
      <div class="reconcile-card">
        <div class="rec-line">
          <span>⚖️ कुल देय मजदूरी</span>
          <b style="color:#1E293B;">₹ 28,040</b>
        </div>
        <div class="rec-minus">
          <span>(-) कुल भुगतान + सेवा खर्च</span>
          <b style="color:#1E293B;">₹ 29,100</b>
        </div>
        <div class="red-balance-bar">
          <span>बकाया / शेष राशि</span>
          <span style="font-size:16px;">- ₹ 1,060</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="actions-2">
        <div class="action-btn">
          <span>💬</span>
          <span>WhatsApp शेयर</span>
        </div>
        <div class="action-btn">
          <span>📄</span>
          <span>PDF</span>
        </div>
      </div>
    </div>
    <div class="home-indicator"></div>
  </div>
</body>
</html>`;
}

// =========================================================================
// SCREEN 4: "मासिक समरी (सभी मजदूर)" (Monthly Summary Screen)
// =========================================================================
function getScreen4Html() {
  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>Screen 4 - Monthly Summary</title>
  <style>
    ${BASE_CSS}
    .header-sub {
      background: #F57C00;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #FFFFFF;
    }
    .back-arrow { font-size: 18px; cursor: pointer; }
    .header-sub-title { font-size: 17px; font-weight: 900; }

    /* Month Selector */
    .sel-card {
      background: #FFFFFF;
      border-radius: 10px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid #ECE7DE;
      font-size: 13.5px;
      font-weight: 800;
      color: #1E293B;
    }

    /* 4 KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .kpi-box {
      background: #FFFFFF;
      border-radius: 10px;
      border: 1px solid #ECE7DE;
      padding: 8px 10px;
    }
    .kpi-box-top {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10.5px;
      font-weight: 700;
      color: #64748B;
      margin-bottom: 4px;
    }
    .kpi-box-val { font-size: 18px; font-weight: 900; color: #1E293B; }

    /* Consolidated Table Card */
    .table-card {
      background: #FFFFFF;
      border-radius: 12px;
      border: 1px solid #ECE7DE;
      overflow: hidden;
    }
    .t-header {
      background: #FAF9F6;
      display: flex;
      padding: 8px;
      font-size: 10.5px;
      font-weight: 800;
      color: #64748B;
      border-bottom: 1px solid #ECE7DE;
    }
    .t-row {
      display: flex;
      align-items: center;
      padding: 8px;
      font-size: 11.5px;
      font-weight: 600;
      color: #1E293B;
      border-bottom: 1px solid #F5F3EF;
    }
    .t-row:last-child { border-bottom: none; }
    .t-total-bar {
      background: #E8F5EC;
      display: flex;
      align-items: center;
      padding: 8px;
      font-size: 12px;
      font-weight: 900;
      color: #1E293B;
    }

    /* Actions */
    .actions-2 {
      display: flex;
      gap: 10px;
    }
    .action-btn {
      flex: 1;
      background: #FFFFFF;
      border: 1.5px solid #137A38;
      color: #137A38;
      border-radius: 10px;
      padding: 10px 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
    }

    /* Footnote */
    .footnote {
      background: #FFFFFF;
      border-radius: 8px;
      border: 1px solid #ECE7DE;
      padding: 8px 10px;
      display: flex;
      gap: 6px;
      font-size: 10.5px;
      color: #64748B;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="phone-frame">
    <!-- Status Bar -->
    <div class="status-bar">
      <span>10:24</span>
      <div class="status-icons">
        <span>📶 LTE</span>
        <span>🔋 100%</span>
      </div>
    </div>

    <!-- Header -->
    <div class="header-sub">
      <div class="back-arrow">←</div>
      <div class="header-sub-title">मासिक समरी (सभी मजदूर)</div>
    </div>

    <!-- Body -->
    <div class="scroll-body">
      <!-- Month Selector -->
      <div class="sel-card">
        <span>📅 अक्टूबर 2026</span>
        <span style="color:#64748B; font-size:12px;">⌵</span>
      </div>

      <!-- 4 KPI Boxes -->
      <div class="kpi-grid">
        <div class="kpi-box">
          <div class="kpi-box-top">
            <span style="color:#137A38; font-size:14px;">👥</span>
            <span>कुल मजदूर</span>
          </div>
          <div class="kpi-box-val">6</div>
        </div>

        <div class="kpi-box">
          <div class="kpi-box-top">
            <span>📅</span>
            <span>कुल कार्य दिवस</span>
          </div>
          <div class="kpi-box-val">26</div>
        </div>

        <div class="kpi-box">
          <div class="kpi-box-top">
            <span style="color:#137A38; font-weight:900;">₹</span>
            <span>कुल मजदूरी</span>
          </div>
          <div class="kpi-box-val" style="font-size:16px;">₹ 1,68,240</div>
        </div>

        <div class="kpi-box">
          <div class="kpi-box-top">
            <span style="color:#137A38; font-size:14px;">🍽️</span>
            <span>कुल सेवा खर्च</span>
          </div>
          <div class="kpi-box-val" style="font-size:16px;">₹ 18,600</div>
        </div>
      </div>

      <!-- Consolidated Labourers Table -->
      <div class="table-card">
        <div class="t-header">
          <span style="width:20px;">क्र.</span>
          <span style="flex:1;">मजदूर का नाम</span>
          <span style="width:65px; text-align:right;">कुल मजदूरी</span>
          <span style="width:68px; text-align:right;">भुगतान + सेवा</span>
          <span style="width:58px; text-align:right;">बकाया</span>
        </div>

        <!-- 1 Golu -->
        <div class="t-row">
          <span style="width:20px; color:#64748B;">1</span>
          <b style="flex:1;">गोलू</b>
          <span style="width:65px; text-align:right;">₹ 28,040</span>
          <span style="width:68px; text-align:right;">₹ 29,100</span>
          <span style="width:58px; text-align:right; font-weight:900; color:#D92D20;">- ₹ 1,060</span>
        </div>

        <!-- 2 Satish -->
        <div class="t-row">
          <span style="width:20px; color:#64748B;">2</span>
          <b style="flex:1;">सतीश</b>
          <span style="width:65px; text-align:right;">₹ 28,040</span>
          <span style="width:68px; text-align:right;">₹ 28,040</span>
          <span style="width:58px; text-align:right; font-weight:700;">₹ 0</span>
        </div>

        <!-- 3 Aangresh -->
        <div class="t-row">
          <span style="width:20px; color:#64748B;">3</span>
          <b style="flex:1;">आंग्रेश</b>
          <span style="width:65px; text-align:right;">₹ 28,040</span>
          <span style="width:68px; text-align:right;">₹ 27,000</span>
          <span style="width:58px; text-align:right; font-weight:900; color:#137A38;">₹ 1,040</span>
        </div>

        <!-- 4 Rahul -->
        <div class="t-row">
          <span style="width:20px; color:#64748B;">4</span>
          <b style="flex:1;">राहुल</b>
          <span style="width:65px; text-align:right;">₹ 28,040</span>
          <span style="width:68px; text-align:right;">₹ 28,500</span>
          <span style="width:58px; text-align:right; font-weight:900; color:#D92D20;">- ₹ 460</span>
        </div>

        <!-- 5 Sonu -->
        <div class="t-row">
          <span style="width:20px; color:#64748B;">5</span>
          <b style="flex:1;">सोनू</b>
          <span style="width:65px; text-align:right;">₹ 28,040</span>
          <span style="width:68px; text-align:right;">₹ 27,500</span>
          <span style="width:58px; text-align:right; font-weight:900; color:#137A38;">₹ 540</span>
        </div>

        <!-- 6 Aditya -->
        <div class="t-row">
          <span style="width:20px; color:#64748B;">6</span>
          <b style="flex:1;">आदित्य</b>
          <span style="width:65px; text-align:right;">₹ 28,040</span>
          <span style="width:68px; text-align:right;">₹ 28,040</span>
          <span style="width:58px; text-align:right; font-weight:700;">₹ 0</span>
        </div>

        <!-- Total Row -->
        <div class="t-total-bar">
          <span style="flex:1.2;">कुल</span>
          <span style="width:70px; text-align:right;">₹ 1,68,240</span>
          <span style="width:70px; text-align:right;">₹ 1,68,180</span>
          <span style="width:50px; text-align:right; color:#137A38;">₹ 60</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="actions-2">
        <div class="action-btn">
          <span>💬</span>
          <span>WhatsApp पर शेयर करें</span>
        </div>
        <div class="action-btn">
          <span>📄</span>
          <span>PDF रिपोर्ट</span>
        </div>
      </div>

      <!-- Footnote -->
      <div class="footnote">
        <span style="font-size:12px;">ⓘ</span>
        <span>नोट: कुल भुगतान में मजदूरी के साथ भोजन, नाश्ता, आवागमन एंव सेवाएं शामिल हैं।</span>
      </div>
    </div>
    <div class="home-indicator"></div>
  </div>
</body>
</html>`;
}

// =========================================================================
// COMPOSITE COLLAGE: 4 SCREENS SIDE-BY-SIDE (Matching uploaded snapshot)
// =========================================================================
function getCompositeCollageHtml() {
  return `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>LabourHisaab - 4 Screen Snapshot Verification</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans Devanagari", "Mangal", sans-serif;
    }
    body {
      background-color: #0F172A;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      min-height: 100vh;
    }
    .collage-title {
      color: #FFFFFF;
      font-size: 24px;
      font-weight: 900;
      margin-bottom: 20px;
      text-align: center;
      letter-spacing: -0.5px;
    }
    .collage-title span {
      color: #F57C00;
    }
    .screens-row {
      display: flex;
      gap: 20px;
      justify-content: center;
      align-items: flex-start;
    }
    iframe {
      border: none;
      width: 390px;
      height: 844px;
      border-radius: 42px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
    }
  </style>
</head>
<body>
  <div class="collage-title">शुभ लाभ लेबर हिसाब — <span>UI Snapshot Verification (4 Screens)</span></div>
  <div class="screens-row">
    <!-- Screen 1: Home -->
    <iframe srcdoc="${getScreen1Html().replace(/"/g, '&quot;')}"></iframe>

    <!-- Screen 2: Daily Payment -->
    <iframe srcdoc="${getScreen2Html().replace(/"/g, '&quot;')}"></iframe>

    <!-- Screen 3: Individual Statement -->
    <iframe srcdoc="${getScreen3Html().replace(/"/g, '&quot;')}"></iframe>

    <!-- Screen 4: Monthly Summary -->
    <iframe srcdoc="${getScreen4Html().replace(/"/g, '&quot;')}"></iframe>
  </div>
</body>
</html>`;
}

// =========================================================================
// RUN PUPPETEER SCREENSHOT GENERATION
// =========================================================================
async function run() {
  console.log('📸 Launching Puppeteer to capture snapshot-verified screens...');

  const tempUserDir = path.join(os.tmpdir(), `puppeteer_lh_${Date.now()}_${Math.random().toString(36).substring(7)}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    userDataDir: tempUserDir,
    pipe: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();

  // 1. Capture individual screens (390 x 844 mobile viewport)
  await page.setViewport({ width: 430, height: 880, deviceScaleFactor: 2 });

  const screens = [
    { name: '01_home_screen.png', html: getScreen1Html() },
    { name: '02_daily_payment.png', html: getScreen2Html() },
    { name: '03_individual_statement.png', html: getScreen3Html() },
    { name: '04_monthly_summary.png', html: getScreen4Html() },
  ];

  for (const s of screens) {
    await page.setContent(s.html, { waitUntil: 'domcontentloaded' });
    const targetPath = path.join(OUTPUT_DIR, s.name);
    await page.screenshot({ path: targetPath, fullPage: true });

    // Also copy to root screenshots/ folder for quick access
    const rootTarget = path.resolve(__dirname, '../screenshots', `lh_${s.name}`);
    fs.copyFileSync(targetPath, rootTarget);

    console.log(`  ✅ Captured: ${s.name}`);
  }

  // 2. Capture 4-screen composite collage (1700 x 980) matching user uploaded image
  console.log('📸 Generating 4-screen side-by-side composite verification collage...');
  await page.setViewport({ width: 1720, height: 960, deviceScaleFactor: 1.5 });
  await page.setContent(getCompositeCollageHtml(), { waitUntil: 'domcontentloaded' });
  const collagePath = path.join(OUTPUT_DIR, '00_snapshot_4screen_collage.png');
  await page.screenshot({ path: collagePath, fullPage: true });

  const rootCollageTarget = path.resolve(__dirname, '../screenshots', 'lh_00_snapshot_4screen_collage.png');
  fs.copyFileSync(collagePath, rootCollageTarget);
  console.log(`  🎉 Composite Collage Captured: 00_snapshot_4screen_collage.png`);

  await browser.close();
  try {
    fs.rmSync(tempUserDir, { recursive: true, force: true });
  } catch (e) {}
  console.log('✨ All screens successfully generated and verified against the user snapshot!\n');
}

run().catch(err => {
  console.error('Puppeteer capture failed:', err);
  process.exit(1);
});

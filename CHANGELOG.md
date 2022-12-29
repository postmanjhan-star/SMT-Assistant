# Changelog
All notable changes to this project will be documented in this file.

The format is based on [如何維護更新日誌](https://keepachangelog.com/zh-TW/1.0.0/),
and this project adheres to [語意化版本](https://semver.org/lang/zh-TW/).

---

## Unreleased
### Added
- 增加起始頁。（7cc889ba）
- 增加智慧料架管理模組。（9db9f70a）
- 如一儲位為智慧料架，會顯示智慧料架標示。（3af61e86）
- 備料作業增加「智慧料架亮燈」鈕。（c4fb38d5）
- 松下打件機助手 CSV 上傳頁增加更明確的成功與失敗訊息。（dcc3a97e）
- 松下打件機助手 CSV 上傳頁增加 CSV 輸出選項說明。（dcc3a97e）
- 儲位可搬家至其他倉，內部的所有物料也會連動。（6ac378c1）
- 新增用 ODS / XLSX 檔案批次建立物料功能。（93e63172）
### Changed
- 整體重構，登陸頁為起始頁，內有 WMS 等 app 可進入。（7cc889ba）
- 松下打件機助手支援一料多槽比對。（3695dc37）
- 倉位管理內頁把儲位的檢視與編輯分離成獨立的頁籤。（f6ac1d78、c1b7efba）
### Deprecated
### Removed
### Fixed
### Security

---

## 1.1.1 - 2022-11-16
### Added
- 所有更新日誌都在 [CHANGELOG.md](CHANGELOG.md)。（c64596cf）
- 倉儲管理可檢視該倉位內所有物料及庫存數量。（f2204e1e）
- Fuji 打件機上料助手增加語音提示，輸入物料後會提示插槽位置。（1cb3481a）
- 首頁增加 Fuji 打件機上料助手連結。（1cb3481a）
- 從舊 ERP 匯入收料單如果無法取得條碼資訊，會中止匯入。（b55a66ad）
- 物料的明細頁面顯示單包裝的有效期限。（f6616dbc）
- 收料單建立頁面會阻擋重複的舊 ERP 收料單號。（94e93e2c）
- 發料會排除已過期之單包，手動指定單包代碼則不論過期與否。（d7141c7c）
- 網頁標題會根據當前所在應用而變，WMS / SMT / ...。（2b378302）
- 增加松下打件機上料助手。（b5407aa3、22805140）
### Changed
- 倉儲管理頁改為按編輯鈕才可編輯。（f2204e1e）
- Fuji 打件機上料助手網址變更為 /smt/fuji-mounter。（1cb3481a）
- Fuji 打件機上料助手首頁改為須輸入工單與機台號，內頁改為僅顯示該工單與機台號之物料資訊。（0ec99c29）
- 優化收料單建立頁在手機的表格樣式。（b55a66ad）
- 優化供應商主頁的表格樣式。（b55a66ad）
- 優化發料單建立頁在手機的表格樣式。（f6616dbc）
- 可發料數量會排除已過期之數量。（d7141c7c）
### Removed
- 移除收料單主頁之無用元件。（b55a66ad）
### Fixed
- 表格內容從靠上修正為置中。（c64596cf）
- Fuji 打件機上料助手內頁會將游標自動定位於物料條碼輸入框。（1cb3481a）

---

## 1.1.0 - 2022-10-21
### Added
- 二次首發

---

## 1.0.0
### Added
- 首發

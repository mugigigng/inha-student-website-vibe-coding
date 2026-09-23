import { INHA_COLLEGES } from '@shared/inhaCatalog.ts';
import { INTERESTS, type AcademicYear, type InterestId, type Profile } from '@shared/profile.ts';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { todayKst } from '../lib/dates.ts';
import { useProfile } from '../lib/profile.tsx';
import './ProfilePage.css';

const YEARS: AcademicYear[] = [1, 2, 3, 4];

/** Lightweight profile form: 5 fields, no account. Saved to this browser only. */
export function ProfilePage() {
  const { profile, save, clear } = useProfile();
  const navigate = useNavigate();
  const thisYear = Number(todayKst().slice(0, 4));

  const [college, setCollege] = useState(profile?.college ?? '');
  const [major, setMajor] = useState(profile?.major ?? '');
  const [year, setYear] = useState<AcademicYear>(profile?.year ?? 1);
  const [entranceYear, setEntranceYear] = useState<number>(profile?.entranceYear ?? thisYear);
  // Until the student picks an entrance year themselves, keep it in step with the chosen year.
  const [entranceTouched, setEntranceTouched] = useState(false);
  const [interests, setInterests] = useState<InterestId[]>(profile?.interests ?? []);

  const majors = INHA_COLLEGES.find((c) => c.college === college)?.majors ?? [];
  const effectiveEntrance = entranceYear;
  const chooseYear = (y: AcademicYear) => {
    setYear(y);
    if (!entranceTouched) setEntranceYear(thisYear - y + 1); // usual entrance year for that academic year
  };
  const canSave = Boolean(college && major);

  const toggleInterest = (id: InterestId) => setInterests((cur) => (cur.includes(id) ? cur.filter((i) => i !== id) : [...cur, id]));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const next: Profile = { college, major, year, entranceYear: effectiveEntrance, interests };
    save(next);
    navigate('/');
  };

  return (
    <section className="profile">
      <p className="profile__eyebrow">내 프로필</p>
      <h1 className="profile__title">나에게 맞는 정보를 먼저 볼 수 있도록 프로필을 설정해주세요.</h1>
      <p className="profile__note">
        설정한 프로필로 공지의 순서만 바꿔요. 모든 공지는 언제나 &lsquo;전체 공지&rsquo;에서 볼 수 있어요. 프로필은 이 브라우저에만 저장되고, 로그인은 필요
        없어요.
      </p>

      <form className="profile__form" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="college">단과대학</label>
          <select
            id="college"
            value={college}
            onChange={(e) => {
              setCollege(e.target.value);
              setMajor('');
            }}
          >
            <option value="">선택해주세요</option>
            {INHA_COLLEGES.map((c) => (
              <option key={c.college} value={c.college}>
                {c.college}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="major">전공</label>
          <select id="major" value={major} onChange={(e) => setMajor(e.target.value)} disabled={!college}>
            <option value="">{college ? '선택해주세요' : '단과대학을 먼저 선택해주세요'}</option>
            {majors.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="field">
          <legend>학년</legend>
          <div className="choice-row">
            {YEARS.map((y) => (
              <button key={y} type="button" className="pill" aria-pressed={year === y} onClick={() => chooseYear(y)}>
                {y}학년
              </button>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="entrance">입학년도</label>
          <select
            id="entrance"
            value={effectiveEntrance}
            onChange={(e) => {
              setEntranceTouched(true);
              setEntranceYear(Number(e.target.value));
            }}
          >
            {Array.from({ length: 10 }, (_, i) => thisYear - i).map((y) => (
              <option key={y} value={y}>
                {y}년 ({String(y).slice(2)}학번)
              </option>
            ))}
          </select>
        </div>

        <fieldset className="field field--wide">
          <legend>
            관심 분야 <span className="field__hint">선택한 분야의 공지를 먼저 보여드려요 · 여러 개 선택 가능</span>
          </legend>
          <div className="choice-row">
            {INTERESTS.map((i) => (
              <button key={i.id} type="button" className="pill" aria-pressed={interests.includes(i.id)} onClick={() => toggleInterest(i.id)}>
                {i.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="profile__actions">
          <button type="submit" className="pill pill--solid" disabled={!canSave}>
            저장하고 맞춤 공지 보기
          </button>
          <Link to="/" className="pill">
            취소
          </Link>
          {profile && (
            <button
              type="button"
              className="profile__clear"
              onClick={() => {
                clear();
                navigate('/');
              }}
            >
              프로필 지우기
            </button>
          )}
        </div>
        {!canSave && <p className="profile__hint">단과대학과 전공을 선택하면 저장할 수 있어요.</p>}
      </form>
    </section>
  );
}

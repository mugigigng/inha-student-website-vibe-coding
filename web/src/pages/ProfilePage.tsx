import { INHA_COLLEGES } from '@shared/inhaCatalog.ts';
import { INTERESTS, type AcademicYear, type InterestId, type Profile } from '@shared/profile.ts';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { todayKst } from '../lib/dates.ts';
import { useLanguage } from '../lib/language.tsx';
import { useProfile } from '../lib/profile.tsx';
import './ProfilePage.css';

const YEARS: AcademicYear[] = [1, 2, 3, 4];

/** Lightweight profile form: 5 fields, no account. Saved to this browser only. */
export function ProfilePage() {
  const { profile, save, clear } = useProfile();
  // Only labels are localized. College/major names are the user's data (official Korean names) and stay as is.
  const { lang, t: all } = useLanguage();
  const t = all.profile;
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
      <p className="profile__eyebrow">{profile ? t.edit : t.eyebrow}</p>
      <h1 className="profile__title">{t.title}</h1>
      <p className="profile__note">{t.note}</p>

      <form className="profile__form" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="college">{t.college}</label>
          <select
            id="college"
            value={college}
            onChange={(e) => {
              setCollege(e.target.value);
              setMajor('');
            }}
          >
            <option value="">{t.choose}</option>
            {INHA_COLLEGES.map((c) => (
              <option key={c.college} value={c.college}>
                {c.college}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="major">{t.major}</label>
          <select id="major" value={major} onChange={(e) => setMajor(e.target.value)} disabled={!college}>
            <option value="">{college ? t.choose : t.chooseCollegeFirst}</option>
            {majors.map((m) => (
              <option key={m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="field">
          <legend>{t.year}</legend>
          <div className="choice-row">
            {YEARS.map((y) => (
              <button key={y} type="button" className="pill" aria-pressed={year === y} onClick={() => chooseYear(y)}>
                {t.yearOption(y)}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="field">
          <label htmlFor="entrance">{t.entranceYear}</label>
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
                {t.entranceOption(y)}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="field field--wide">
          <legend>
            {t.interests} <span className="field__hint">{t.interestsHint}</span>
          </legend>
          <div className="choice-row">
            {INTERESTS.map((i) => (
              <button key={i.id} type="button" className="pill" aria-pressed={interests.includes(i.id)} onClick={() => toggleInterest(i.id)}>
                {lang === 'en' ? i.en : i.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="profile__actions">
          <button type="submit" className="pill pill--solid" disabled={!canSave}>
            {t.save}
          </button>
          <Link to="/" className="pill">
            {t.cancel}
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
              {t.clear}
            </button>
          )}
        </div>
        {!canSave && <p className="profile__hint">{t.saveHint}</p>}
      </form>
    </section>
  );
}

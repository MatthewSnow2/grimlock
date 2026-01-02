import { sayHello, sayGoodbye, getTimeGreeting } from './index';

describe('Greeting Tools', () => {
  describe('sayHello', () => {
    it('should return a greeting with the provided name', () => {
      const result = sayHello('Alice');
      expect(result).toBe('Hello, Alice! Welcome!');
    });

    it('should handle different names', () => {
      const result = sayHello('Bob');
      expect(result).toBe('Hello, Bob! Welcome!');
    });

    it('should handle names with spaces', () => {
      const result = sayHello('John Doe');
      expect(result).toBe('Hello, John Doe! Welcome!');
    });
  });

  describe('sayGoodbye', () => {
    it('should return a farewell message with the provided name', () => {
      const result = sayGoodbye('Alice');
      expect(result).toBe('Goodbye, Alice! Have a great day!');
    });

    it('should handle different names', () => {
      const result = sayGoodbye('Charlie');
      expect(result).toBe('Goodbye, Charlie! Have a great day!');
    });
  });

  describe('getTimeGreeting', () => {
    const originalDate = global.Date;

    afterEach(() => {
      global.Date = originalDate;
    });

    it('should return morning greeting between 5am and 12pm', () => {
      const mockDate = new Date('2026-01-02T09:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      const result = getTimeGreeting();
      expect(result).toBe('Good morning! Hope you have a wonderful day ahead.');
    });

    it('should return afternoon greeting between 12pm and 5pm', () => {
      const mockDate = new Date('2026-01-02T14:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      const result = getTimeGreeting();
      expect(result).toBe('Good afternoon! Hope your day is going well.');
    });

    it('should return evening greeting between 5pm and 9pm', () => {
      const mockDate = new Date('2026-01-02T19:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      const result = getTimeGreeting();
      expect(result).toBe('Good evening! Hope you had a productive day.');
    });

    it('should return night greeting after 9pm', () => {
      const mockDate = new Date('2026-01-02T23:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      const result = getTimeGreeting();
      expect(result).toBe('Good night! Rest well.');
    });

    it('should return night greeting before 5am', () => {
      const mockDate = new Date('2026-01-02T03:00:00');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as Date);

      const result = getTimeGreeting();
      expect(result).toBe('Good night! Rest well.');
    });
  });
});

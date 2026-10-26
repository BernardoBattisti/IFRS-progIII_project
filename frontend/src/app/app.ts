import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterOutlet } from '@angular/router';
import { catchError, of } from 'rxjs';

interface Health {
  status: string;
  database: string;
}

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly http = inject(HttpClient);

  protected readonly health = toSignal(
    this.http
      .get<Health>('/api/health')
      .pipe(catchError(() => of<Health>({ status: 'DOWN', database: 'DESCONHECIDO' }))),
  );
}
